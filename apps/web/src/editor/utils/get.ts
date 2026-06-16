import { HandleSelect } from 'src/editor/handle/select'
import { YClients } from 'src/editor/y-state/y-clients'
import { YState } from 'src/editor/y-state/y-state'

export function getSelectIdMap() {
  return HandleSelect.selectIdMap
}

export function getSelectIdList() {
  return HandleSelect.selectIdList.filter((id) => YState.state[id])
}

export function getSelectPageId() {
  return HandleSelect.selectPageId
}

export function getAllSelectIdMap() {
  return {
    ...HandleSelect.selectIdMap,
    ...Object.values(YClients.others).reduce((acc, client) => {
      return { ...acc, ...client.selectIdMap }
    }, {}),
  }
}

export const getSelectedNodes = () => {
  return getSelectIdList().map((id) => YState.find<S.Node>(id))
}
