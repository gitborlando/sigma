import {
  ScopedDI,
  ServiceContainer,
  ServiceInstances,
} from '@gitborlando/di-service'
import { apiServices } from '@sigma/api'
import { cloudBaseServices } from '@sigma/cloudbase'
import { FileAction } from 'src/global/file'
import { ImageMgr } from './resource/image-mgr'
import { ObjectMgr } from './resource/object-mgr'
import { Uploader } from './resource/uploader'

const toolServices = {
  uploader: Uploader,
  objectMgr: ObjectMgr,
  imageMgr: ImageMgr,
  fileAction: FileAction,
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

export function setupCloudbaseAPI(container: ScopedDI) {
  container.override(apiServices.authAPI, cloudBaseServices.authAPI)
  container.override(apiServices.storageAPI, cloudBaseServices.storageAPI)
  container.override(apiServices.fileAPI, cloudBaseServices.fileAPI)
  container.override(apiServices.docAPI, cloudBaseServices.docAPI)
}
