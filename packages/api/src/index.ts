import {
  ClassConstructor,
  ScopedDI,
  ServiceInstances,
} from '@gitborlando/di-service'
import { AuthAPI } from './auth'
import { FileAPI } from './file'
import { StorageAPI } from './storage'

export * from './auth'
export * from './file'
export * from './storage'

export const apiServices = {
  authAPI: AuthAPI,
  storageAPI: StorageAPI,
  fileAPI: FileAPI,
}

export type APIServices = ServiceInstances<typeof apiServices>
export type APIServiceId = keyof APIServices

export type APIImplements = { [K in APIServiceId]: ClassConstructor<APIServices[K]> }

export function setupAPIImplements(container: ScopedDI, providers: APIImplements) {
  for (const key of Object.keys(providers) as APIServiceId[]) {
    container.override(apiServices[key], providers[key] as any)
  }
}
