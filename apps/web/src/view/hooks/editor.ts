import { createContext } from 'react'
import { Editor } from 'src/editor'

export const EditorContext = createContext<Editor>(null!)

export function useEditor() {
  return useContext(EditorContext)
}
