import { useEditorService } from 'src/view/hooks/editor'

export function useSelectIds() {
  return useEditorService('handleSelect').selectIdList
}

export function useSelectIdMap() {
  return useEditorService('handleSelect').selectIdMap
}

export function useAllSelectIdMap() {
  const handleSelect = useEditorService('handleSelect')
  const yAware = useEditorService('yAware')
  return {
    ...handleSelect.selectIdMap,
    ...Object.values(yAware.others).reduce(
      (acc, client) => ({ ...acc, ...client.selectIdMap }),
      {},
    ),
  }
}

export function useSelectPageId() {
  return useEditorService('handleSelect').selectPageId
}
