import { ServiceContainer, ServiceInstances } from '@gitborlando/di-service'
import { apiServices } from '@sigma/api'
import { DocAction } from 'src/editor/action/doc'
import { ImageMgr } from './services/toolkit/image-mgr'
import { ObjectMgr } from './services/toolkit/object-mgr'
import { Uploader } from './services/toolkit/uploader'

const toolServices = {
  uploader: Uploader,
  objectMgr: ObjectMgr,
  imageMgr: ImageMgr,
  docAction: DocAction,
}

const globalServices = { ...apiServices, ...toolServices }

export type GlobalServices = ServiceInstances<typeof globalServices>
export type GlobalServiceId = keyof GlobalServices

export class Global extends ServiceContainer<typeof globalServices> {
  protected static instance: Global

  constructor() {
    super(globalServices)
  }

  static getInstance() {
    if (this.instance) return this.instance
    return (this.instance = new this())
  }
}
