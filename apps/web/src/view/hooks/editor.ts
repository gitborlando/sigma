import { createContext, useContext } from 'react'
import { Editor, type EditorServiceId, type EditorServices } from 'src/editor'
import type { Service } from 'src/global/service'

export const EditorContext = createContext<Editor>(null!)

export function useEditor() {
  return useContext(EditorContext)
}

const serviceProxyMap = new WeakMap<Editor, EditorServices>()

export function useEditorServices() {
  const editor = useEditor()
  const existed = serviceProxyMap.get(editor)
  if (existed) return existed

  const cache = new Map<EditorServiceId, Service>()
  const proxy = new Proxy({} as EditorServices, {
    get: (_, id) => {
      if (typeof id !== 'string') return

      const serviceId = id as EditorServiceId
      if (cache.has(serviceId)) return cache.get(serviceId)

      const service = editor.resolve(serviceId)
      cache.set(serviceId, service)
      return service
    },
  })

  serviceProxyMap.set(editor, proxy)
  return proxy
}
