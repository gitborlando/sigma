import { SchemaCreator } from 'src/editor/schema/creator'
import { Select } from 'src/editor/select'
import { Service } from 'src/global/service'
import { YState } from '../y-adapter/y-state'
import { Undo } from './undo'

@reflection
export class PageAction extends Service {
  constructor(
    private readonly schemaCreator: SchemaCreator,
    private readonly yState: YState,
    private readonly undo: Undo,
    private readonly select: Select,
  ) {
    super()
    autoBind(this)
  }

  addPage(page = this.schemaCreator.page()) {
    this.yState.transact(() => {
      this.yState.set<S.Page>([page.id], page)
      this.yState.insert<S.Meta>(['meta', 'pageIds'], page.id)
    })
    this.select.selectPage(page.id)
    this.undo.track('all', t('add and select page'))
  }

  removePage = (page: S.Page) => {
    const pageIds = this.yState.state.meta.pageIds
    if (pageIds.length === 1) return

    this.yState.transact(() => {
      this.yState.delete<S.Page>([page.id])
      this.yState.delete<S.Meta>(['meta', 'pageIds', pageIds.indexOf(page.id)])
    })
    this.select.selectPage(pageIds[0])
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

    console.log({ meta: this.yState.state.meta, page: curPage, ...nodes })
  }
}
