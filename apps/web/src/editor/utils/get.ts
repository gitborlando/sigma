import { EditorSetting } from 'src/editor/editor/setting'
import { HandleSelect } from 'src/editor/handle/select'
import { StageViewport } from 'src/editor/stage/viewport'
import { YClients } from 'src/editor/y-state/y-clients'
import { YState } from 'src/editor/y-state/y-state'

const allSelectIdMap = computed(() => ({
  ...HandleSelect.selectIdMap,
  ...Object.values(YClients.others).reduce((acc, client) => {
    return { ...acc, ...client.selectIdMap }
  }, {}),
}))

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

export const getSelectedNodes = () => {
  return getSelectIdList().map((id) => YState.find<S.Node>(id))
}
export const getZoom = () => StageViewport.zoom

export function getEditorSetting() {
  return EditorSetting.setting
}
