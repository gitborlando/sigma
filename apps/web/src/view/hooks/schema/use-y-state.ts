import { getSelectIdList, getSelectPageId } from 'src/editor/utils/get'
import { useEditor } from 'src/view/hooks/editor'
import { useShallow } from 'src/view/hooks/schema/use-shallow'

export function useSelectNodes() {
  const editor = useEditor()
  const selectIds = getSelectIdList(editor)
  return useSchema(useShallow((state) => selectIds.map((id) => state[id] as S.Node)))
}

export function useSelectPage() {
  const editor = useEditor()
  const selectPageId = getSelectPageId(editor)
  return useSchema((state) => state[selectPageId] as S.Page)
}

export function useSchema<T>(selector: (state: S.Schema) => T): T {
  const editor = useEditor()
  return useSyncExternalStore(editor.yState.listen, () =>
    selector(editor.yState.state),
  )
}
