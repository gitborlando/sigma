import { Disposer } from '@gitborlando/toolkit/disposer'
import { IMatrix, Matrix } from 'src/editor/geometry'
import { HandleSelectService } from 'src/editor/handle/select'
import { SchemaCreatorService } from 'src/editor/schema/creator'
import { StageViewportService } from 'src/editor/stage/viewport'
import { Service } from 'src/global/service'
import { UndoService } from '../core/undo'
import { YStateService } from '../y-adapter/y-state'

export class HandlePageService extends Service {
  pageSceneMatrix = new Map<ID, IMatrix>()

  constructor(
    private readonly schemaCreator: SchemaCreatorService,
    private readonly yState: YStateService,
    private readonly undo: UndoService,
    private readonly handleSelect: HandleSelectService,
    private readonly stageViewport: StageViewportService,
  ) {
    super()
    autoBind(this)
  }

  subscribe = () => {
    return Disposer.combine(this.memoPageSceneMatrix())
  }

  addPage(page = this.schemaCreator.page()) {
    this.yState.transact(() => {
      this.yState.set<S.Page>([page.id], page)
      this.yState.insert(['meta', 'pageIds'], page.id)
    })

    this.undo.untrack(() => this.handleSelect.selectPage(page.id))
    this.undo.track('all', t('add and select page'))
  }

  removePage = (page: S.Page) => {
    if (this.yState.state.meta.pageIds.length === 1) return

    this.yState.transact(() => {
      this.yState.delete<S.Page>([page.id])
      this.yState.delete([
        'meta',
        'pageIds',
        this.yState.state.meta.pageIds.indexOf(page.id),
      ])
    })

    this.undo.untrack(() =>
      this.handleSelect.selectPage(this.yState.state.meta.pageIds[0]),
    )
    this.undo.track('all', t('delete page'))
  }

  private memoPageSceneMatrix = () => {
    return reaction(
      () => this.stageViewport.sceneMatrix,
      (matrix) => {
        this.pageSceneMatrix.set(this.handleSelect.selectPageId, Matrix.of(matrix))
      },
    )
  }

  DEV_logPageSchema = (id: ID) => {
    const curPage = this.yState.find<S.Page>(id)
    const nodes: Record<ID, S.SchemaItem> = {}
    const findNodes = (id: string) => {
      const node = this.yState.find<S.SchemaItem>(id)
      nodes[node.id] = node
      if ('childIds' in node) {
        node.childIds
          .map((id) => this.yState.find<S.SchemaItem>(id))
          .forEach((node) => (nodes[node.id] = node))
      }
    }
    curPage.childIds.forEach(findNodes)

    console.log({
      meta: this.yState.state.meta,
      page: curPage,
      ...nodes,
    })
  }
}
