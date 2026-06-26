import { Disposer } from '@gitborlando/toolkit/disposer'
import { IMatrix, Matrix } from 'src/editor/geometry'
import { EditorService } from 'src/editor/service'
import { getSelectPageId } from '../utils/get'

export class HandlePageService extends EditorService {
  pageSceneMatrix = new Map<ID, IMatrix>()

  subscribe() {
    return Disposer.combine(this.memoPageSceneMatrix())
  }

  addPage(page = this.editor.schemaCreator.page()) {
    this.editor.yState.transact(() => {
      this.editor.yState.set<S.Page>([page.id], page)
      this.editor.yState.insert(['meta', 'pageIds'], page.id)
    })

    this.editor.undo.untrack(() => this.editor.handleSelect.selectPage(page.id))
    this.editor.undo.track('all', t('add and select page'))
  }

  removePage(page: S.Page) {
    if (this.editor.yState.state.meta.pageIds.length === 1) return

    this.editor.yState.transact(() => {
      this.editor.yState.delete<S.Page>([page.id])
      this.editor.yState.delete([
        'meta',
        'pageIds',
        this.editor.yState.state.meta.pageIds.indexOf(page.id),
      ])
    })

    this.editor.undo.untrack(() =>
      this.editor.handleSelect.selectPage(this.editor.yState.state.meta.pageIds[0]),
    )
    this.editor.undo.track('all', t('delete page'))
  }

  private memoPageSceneMatrix() {
    return reaction(
      () => this.editor.stageViewport.sceneMatrix,
      (matrix) => {
        this.pageSceneMatrix.set(getSelectPageId(this.editor), Matrix.of(matrix))
      },
    )
  }

  DEV_logPageSchema(id: ID) {
    const curPage = this.editor.find<S.Page>(id)
    const nodes: Record<ID, S.SchemaItem> = {}
    const findNodes = (id: string) => {
      const node = this.editor.find<S.SchemaItem>(id)
      nodes[node.id] = node
      if ('childIds' in node) {
        node.childIds
          .map((id) => this.editor.find<S.SchemaItem>(id))
          .forEach((node) => (nodes[node.id] = node))
      }
    }
    curPage.childIds.forEach(findNodes)

    console.log({
      meta: this.editor.yState.state.meta,
      page: curPage,
      ...nodes,
    })
  }
}
