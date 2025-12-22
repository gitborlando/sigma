import { createObjCache } from '@gitborlando/utils'
import autobind from 'class-autobind-decorator'
import { IXY } from 'src/shared/utils/normal'
import { SchemaCreator } from '../schema/creator'
import { Schema } from '../schema/schema'
import { ID, IPage } from '../schema/type'
import { OperateNode } from './node'

@autobind
class OperatePageService {
  get currentPage() {
    return Schema.find<IPage>(Schema.client.selectPageId)
  }

  selectPage(id: ID) {
    Schema.itemReset(Schema.client, ['selectPageId'], id)
    OperateNode.clearSelect()
    OperateNode.commitSelect()
    Schema.commitOperation(`选择页面 ${id}`)
  }

  addPage(page = SchemaCreator.page()) {
    Schema.addItem(page)
    Schema.itemAdd(Schema.meta, ['pageIds', Schema.meta.pageIds.length], page.id)
    Schema.itemAdd(Schema.client, ['viewport', page.id], { zoom: 1, xy: XY.$(0, 0) })
    this.selectPage(page.id)
    Schema.finalOperation('添加页面')
  }

  removePage(page: IPage) {
    Schema.removeItem(page)
    Schema.itemDelete(Schema.meta, ['pageIds', Schema.meta.pageIds.indexOf(page.id)])
    Schema.finalOperation('移除页面')
    this.pageViewport.delete(page.id)
  }

  private pageViewport = createObjCache<{ zoom: number; offset: IXY }>()

  getCurrentViewport() {
    return this.pageViewport.getSet(this.currentPage.id, () => ({
      zoom: 1,
      offset: XY.$(),
    }))
  }

  setCurrentViewport(viewport: { zoom?: number; offset?: IXY }) {
    const lastViewport = this.getCurrentViewport()
    const zoom = viewport.zoom || lastViewport.zoom
    const offset = viewport.offset || lastViewport.offset
    this.pageViewport.set(this.currentPage.id, { zoom, offset })
  }
}

export const OperatePage = new OperatePageService()
