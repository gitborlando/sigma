import { useEditorService } from 'src/view/hooks/editor'

export function useSelectIds() {
  return useEditorService('handleSelect').selectIdList
}

export function useSelectIdMap() {
  return useEditorService('handleSelect').selectIdMap
}

export function useAllSelectIdMap() {
  const handleSelect = useEditorService('handleSelect')
  const yClients = useEditorService('yClients')
  return {
    ...handleSelect.selectIdMap,
    ...Object.values(yClients.others).reduce(
      (acc, client) => ({ ...acc, ...client.selectIdMap }),
      {},
    ),
  }
}

export function useSelectPageId() {
  return useEditorService('handleSelect').selectPageId
}
