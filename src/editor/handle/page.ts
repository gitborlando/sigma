import { createCache } from '@gitborlando/utils'
import { IMatrix } from 'src/editor/math'
import { StageViewport } from 'src/editor/stage/viewport'
import { prodLog } from 'src/utils/global'
import { SchemaCreator } from '../schema/creator'
import { getSelectPageId } from '../utils/get'

class HandlePageService {
  pageSceneMatrix = createCache<ID, IMatrix>()

  subscribe() {
    return Disposer.collect(this.memoPageSceneMatrix())
  }

  addPage(page = SchemaCreator.page()) {
    YState.set(`${page.id}`, page)
    YState.insert('meta.pageIds', page.id)
    YState.next()

    YUndo.untrack(() => YClients.selectPage(page.id))
    YUndo.track2('all', t('add and select page'))
  }

  removePage(page: S.Page) {
    if (YState.state.meta.pageIds.length === 1) return

    YState.delete(`${page.id}`)
    YState.delete(`meta.pageIds.${YState.state.meta.pageIds.indexOf(page.id)}`)
    YState.next()

    YUndo.untrack(() => YClients.selectPage(YState.state.meta.pageIds[0]))
    YUndo.track2('all', t('delete page'))
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

    prodLog({
      meta: YState.state.meta,
      page: curPage,
      ...nodes,
    })
  }
}

export const HandlePage = autoBind(new HandlePageService())
