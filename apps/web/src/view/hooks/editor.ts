import { createContext } from 'react'
import { EditorService2 } from 'src/editor'

export const EditorContext = createContext<EditorService2>(null!)

export function useEditor() {
  return useContext(EditorContext)
}
