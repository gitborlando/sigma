import { EditorSetting, HandleSelect, StageViewport, YClients, YState } from '..'

const allSelectIdMap = computed(() => ({
  ...HandleSelect.selectIdMap,
  ...Object.values(YClients.others).reduce((acc, client) => {
    return { ...acc, ...client.selectIdMap }
  }, {}),
}))

export function getZoom() {
  return StageViewport.zoom
}

export function getSetting() {
  return EditorSetting.setting
}

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
  return allSelectIdMap.get()
}

export function getSelectedNodes() {
  return getSelectIdList().map((id) => YState.find<S.Node>(id))
}
