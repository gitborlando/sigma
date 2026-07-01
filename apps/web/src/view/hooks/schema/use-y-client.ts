import { useEditorServices } from 'src/view/hooks/editor'

export function useSelectIds() {
  const { handleSelect } = useEditorServices()
  return handleSelect.selectIdList
}

export function useSelectIdMap() {
  const { handleSelect } = useEditorServices()
  return handleSelect.selectIdMap
}

export function useAllSelectIdMap() {
  const { handleSelect, yAware } = useEditorServices()
  return {
    ...handleSelect.selectIdMap,
    ...Object.values(yAware.others).reduce(
      (acc, client) => ({ ...acc, ...client.selectIdMap }),
      {},
    ),
  }
}

export function useSelectPageId() {
  const { handleSelect } = useEditorServices()
  return handleSelect.selectPageId
}
