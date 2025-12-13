import { createCache } from '@gitborlando/utils'
import { IMatrix } from 'src/editor/math'
import { StageViewport } from 'src/editor/stage/viewport'
import { getSelectPageId } from 'src/editor/y-state/y-clients'
import { ProdLog } from 'src/utils/global'
import { SchemaCreator } from '../schema/creator'

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

  removePage(page: V1.Page) {
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
        this.pageSceneMatrix.set(getSelectPageId(), matrix.tuple())
      },
    )
  }

  DEV_logPageSchema(id: ID) {
    const curPage = YState.find<V1.Page>(id)
    const nodes: Record<ID, V1.SchemaItem> = {}
    const findNodes = (id: string) => {
      const node = YState.find<V1.SchemaItem>(id)
      nodes[node.id] = node
      if ('childIds' in node) {
        node.childIds.map(YState.find).forEach((node) => (nodes[node.id] = node))
      }
    }
    curPage.childIds.forEach(findNodes)

    ProdLog({
      meta: YState.state.meta,
      page: curPage,
      ...nodes,
    })
  }
}

export const HandlePage = autoBind(new HandlePageService())
