import { useEditorServices } from 'src/view/hooks/editor'
import { useShallow } from 'src/view/hooks/schema/use-shallow'

export function useSelectNodes() {
  const { select } = useEditorServices()
  const selectIds = select.selectIds
  return useSchema(
    useShallow((state) => selectIds.map((id) => state.graphs[id] as S.Node)),
  )
}

export function useSelectPage() {
  const { select } = useEditorServices()
  const selectPageId = select.selectPageId
  return useSchema((state) => state.graphs[selectPageId] as S.Page)
}

export function useSchema<T>(selector: (state: S.Doc) => T): T {
  const { yDoc } = useEditorServices()
  return useSyncExternalStore(yDoc.register, () => selector(yDoc.doc))
}
