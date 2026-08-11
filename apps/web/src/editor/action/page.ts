import { DocCreator } from 'src/editor/doc/creator'
import { findNode, findPage } from 'src/editor/doc/finder'
import { DocHelper } from 'src/editor/doc/helper'
import { Select } from 'src/editor/select'
import { GRAPHS } from 'src/global/constant'
import { Service } from 'src/global/service'
import { YDoc } from '../y-adapter/y-doc'
import { Undo } from './undo'

@reflection
export class PageAction extends Service {
  constructor(
    private readonly docCreator: DocCreator,
    private readonly yDoc: YDoc,
    private readonly undo: Undo,
    private readonly select: Select,
  ) {
    super()
    autoBind(this)
  }

  addPage(page = this.docCreator.page()) {
    this.yDoc.transact(() => {
      this.yDoc.set<S.Page>([GRAPHS, page.id], page)
      this.yDoc.insert<S.Meta>(['meta', 'pageIds'], page.id)
    })
    this.select.selectPage(page.id)
    this.undo.track('all', t('add and select page'))
  }

  removePage = (page: S.Page) => {
    const pageIds = this.yDoc.doc.meta.pageIds
    if (pageIds.length === 1) return

    this.yDoc.transact(() => {
      this.yDoc.delete<S.Page>([GRAPHS, page.id])
      this.yDoc.delete<S.Meta>(['meta', 'pageIds', pageIds.indexOf(page.id)])
    })
    this.select.selectPage(pageIds[0])
    this.undo.track('all', t('delete page'))
  }

  DEV_logPageSchema = (id: ID) => {
    const curPage = findPage(id)
    const nodes: Record<ID, S.Node> = {}
    const findNodes = (id: string) => {
      const node = findNode(id)
      nodes[node.id] = node
      if (DocHelper.isParent(node)) {
        node.childIds
          .map((id) => findNode(id))
          .forEach((node) => (nodes[node.id] = node))
      }
    }
    curPage.childIds.forEach(findNodes)

    console.log({ meta: this.yDoc.doc.meta, page: curPage, ...nodes })
  }
}
