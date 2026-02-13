import { YClients } from 'src/editor/y-state/y-clients'
import { YState } from 'src/editor/y-state/y-state'

export function getSelectIdMap() {
  return YClients.client.selectIdMap
}

export function getSelectIdList() {
  return YClients.selectIdList
}

export function getSelectPageId() {
  return YClients.client.selectPageId
}

export function getAllSelectIdMap() {
  return YClients.allSelectIdMap
}

export const getSelectedNodes = () => {
  return getSelectIdList().map((id) => YState.find<S.Node>(id))
}
