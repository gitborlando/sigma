import { Disposer } from '@gitborlando/toolkit/disposer'
import { IMatrix, Matrix } from 'src/editor/geometry'
import { HandleSelect, SchemaCreator, StageViewport, Undo, YState } from '..'
import { getSelectPageId } from '../utils/get'

export class HandlePageService {
  pageSceneMatrix = new Map<ID, IMatrix>()

  subscribe() {
    return Disposer.combine(this.memoPageSceneMatrix())
  }

  addPage(page = SchemaCreator.page()) {
    YState.transact(() => {
      YState.set<S.Page>([page.id], page)
      YState.insert(['meta', 'pageIds'], page.id)
    })

    Undo.untrack(() => HandleSelect.selectPage(page.id))
    Undo.track('all', t('add and select page'))
  }

  removePage(page: S.Page) {
    if (YState.state.meta.pageIds.length === 1) return

    YState.transact(() => {
      YState.delete<S.Page>([page.id])
      YState.delete(['meta', 'pageIds', YState.state.meta.pageIds.indexOf(page.id)])
    })

    Undo.untrack(() => HandleSelect.selectPage(YState.state.meta.pageIds[0]))
    Undo.track('all', t('delete page'))
  }

  private memoPageSceneMatrix() {
    return reaction(
      () => StageViewport.sceneMatrix,
      (matrix) => {
        this.pageSceneMatrix.set(getSelectPageId(), Matrix.of(matrix))
      },
    )
  }

  DEV_logPageSchema(id: ID) {
    const curPage = YState.find<S.Page>(id)
    const nodes: Record<ID, S.SchemaItem> = {}
    const findNodes = (id: string) => {
      const node = YState.find<S.SchemaItem>(id)
      nodes[node.id] = node
      if ('childIds' in node) {
        node.childIds.map(YState.find).forEach((node) => (nodes[node.id] = node))
      }
    }
    curPage.childIds.forEach(findNodes)

    console.log({
      meta: YState.state.meta,
      page: curPage,
      ...nodes,
    })
  }
}
