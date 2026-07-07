import { reflection } from 'first-di'
import { HandleSelect } from 'src/editor/handle/select'
import { SchemaCreator } from 'src/editor/schema/creator'
import { Service } from 'src/global/service'
import { Undo } from '../core/undo'
import { YState } from '../y-adapter/y-state'

@reflection
export class HandlePage extends Service {
  constructor(
    private readonly schemaCreator: SchemaCreator,
    private readonly yState: YState,
    private readonly undo: Undo,
    private readonly handleSelect: HandleSelect,
  ) {
    super()
    autoBind(this)
  }

  addPage(page = this.schemaCreator.page()) {
    this.yState.transact(() => {
      this.yState.set<S.Page>([page.id], page)
      this.yState.insert<S.Meta>(['meta', 'pageIds'], page.id)
    })

    this.undo.untrack(() => this.handleSelect.selectPage(page.id))
    this.undo.track('all', t('add and select page'))
  }

  removePage = (page: S.Page) => {
    if (this.yState.state.meta.pageIds.length === 1) return

    this.yState.transact(() => {
      this.yState.delete<S.Page>([page.id])
      this.yState.delete<S.Meta>([
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
