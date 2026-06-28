import { createContext, useContext } from 'react'
import { Editor, type EditorServices } from 'src/editor'

export const EditorContext = createContext<Editor>(null!)

export function useEditor() {
  return useContext(EditorContext)
}

export function useEditorService<K extends keyof EditorServices>(id: K) {
  const editor = useContext(EditorContext)
  return editor.resolve(id)
}
