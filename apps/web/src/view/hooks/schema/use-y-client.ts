import { useEditorServices } from 'src/view/hooks/editor'

export function useSelectIds() {
  const { handleSelect } = useEditorServices()
  return handleSelect.selectIds
}

export function useSelection() {
  const { handleSelect } = useEditorServices()
  return handleSelect.selection
}

export function useAllSelection() {
  const { handleSelect, yAware } = useEditorServices()
  return {
    ...handleSelect.selection,
    ...Object.values(yAware.others).reduce(
      (acc, client) => ({ ...acc, ...client.selection }),
      {},
    ),
  }
}

export function useSelectPageId() {
  const { handleSelect } = useEditorServices()
  return handleSelect.selectPageId
}
