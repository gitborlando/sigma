import { EditorService2, YState } from 'src/editor'
import { getSelectIdList, getSelectPageId } from 'src/editor/utils/get'
import { useShallow } from 'src/view/hooks/schema/use-shallow'

export function useSelectNodes(editor: EditorService2) {
  const selectIds = getSelectIdList(editor)
  return useSchema(useShallow((state) => selectIds.map((id) => state[id] as S.Node)))
}

export function useSelectPage(editor: EditorService2) {
  const selectPageId = getSelectPageId(editor)
  return useSchema((state) => state[selectPageId] as S.Page)
}

export function useSchema<T>(selector: (state: S.Schema) => T): T {
  return useSyncExternalStore(YState.listen, () => selector(YState.state))
}
