import { useEditorServices } from 'src/view/hooks/use-editor'

export function useSelectIds() {
  const { select } = useEditorServices()
  return select.selectIds
}

export function useSelection() {
  const { select } = useEditorServices()
  return select.selection
}

export function useAllSelection() {
  const { select, yAware } = useEditorServices()
  return {
    ...select.selection,
    ...Object.values(yAware.others).reduce(
      (acc, client) => ({ ...acc, ...client.selection }),
      {},
    ),
  }
}

export function useSelectPageId() {
  const { select } = useEditorServices()
  return select.selectPageId
}
