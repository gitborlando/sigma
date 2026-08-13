import { useEditorServices } from 'src/view/hooks/use-editor'
import { useSelectIds, useSelectPageId } from 'src/view/hooks/use-selection'
import { useShallow } from 'src/view/hooks/use-shallow'

export function useSelectNodes() {
  const selectIds = useSelectIds()
  return useDoc(useShallow((doc) => selectIds.map((id) => doc.graphs[id] as S.Node)))
}

export function useSelectPage() {
  const { select } = useEditorServices()
  const selectPageId = useSelectPageId()
  return useDoc((doc) => doc.graphs[selectPageId] as S.Page)
}

export function useDoc<T>(selector: (doc: S.Doc) => T): T {
  const { yDoc } = useEditorServices()
  return useSyncExternalStore(yDoc.register, () => selector(yDoc.doc))
}
