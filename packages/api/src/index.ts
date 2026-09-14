import { ClassConstructor, ServiceInstances } from '@gitborlando/di-service'
import { AuthAPI } from './auth'
import { DocAPI } from './doc'
import { FileAPI } from './file'
import { StorageAPI } from './storage'

export * from './auth'
export * from './doc'
export * from './file'
export * from './storage'

export const apiServices = {
  authAPI: AuthAPI,
  storageAPI: StorageAPI,
  fileAPI: FileAPI,
  docAPI: DocAPI,
}

export type APIServices = ServiceInstances<typeof apiServices>
export type APIServiceId = keyof APIServices

export type APIImplements = { [K in APIServiceId]: ClassConstructor<APIServices[K]> }
