import { useEditorService } from 'src/view/hooks/editor'
import { useShallow } from 'src/view/hooks/schema/use-shallow'

export function useSelectNodes() {
  const handleSelect = useEditorService('handleSelect')
  const selectIds = handleSelect.selectIdList
  return useSchema(useShallow((state) => selectIds.map((id) => state[id] as S.Node)))
}

export function useSelectPage() {
  const handleSelect = useEditorService('handleSelect')
  const selectPageId = handleSelect.selectPageId
  return useSchema((state) => state[selectPageId] as S.Page)
}

export function useSchema<T>(selector: (state: S.Schema) => T): T {
  const yState = useEditorService('yState')
  return useSyncExternalStore(yState.listen, () => selector(yState.state))
}
