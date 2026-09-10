import type {
  ServiceContainer,
  ServiceInstances,
  ServiceMap,
} from '@gitborlando/di-service'
import { createContext, useContext } from 'react'
import { Editor } from 'src/editor'
import { Global } from 'src/global'

export const GlobalContext = createContext<Global>(null!)
export const EditorContext = createContext<Editor>(null!)

export const useGlobal = () => useContext(GlobalContext)
export const useEditor = () => useContext(EditorContext)

export const useGlobalServices = () => getServiceProxy(useGlobal())
export const useEditorServices = () => getServiceProxy(useEditor())

const serviceProxyMap = new WeakMap<object, object>()

const getServiceProxy = <Map extends ServiceMap>(
  container: ServiceContainer<Map>,
): ServiceInstances<Map> => {
  const existed = serviceProxyMap.get(container)
  if (existed) return existed as ServiceInstances<Map>

  type Key = keyof Map
  type Services = ServiceInstances<Map>

  const cache = new Map<Key, Services[Key]>()
  const proxy = new Proxy({} as Services, {
    get: (_, id) => {
      if (typeof id !== 'string') return

      const serviceId = id as Key
      if (cache.has(serviceId)) return cache.get(serviceId)

      const service = container.resolve(serviceId)
      cache.set(serviceId, service)
      return service
    },
  })

  serviceProxyMap.set(container, proxy)
  return proxy
}
