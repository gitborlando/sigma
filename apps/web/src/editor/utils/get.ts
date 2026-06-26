import type { Editor } from '..'

export function getZoom(editor: Editor) {
  return editor.stageViewport.zoom
}

export function getSetting(editor: Editor) {
  return editor.editorSetting.setting
}

export function getSelectIdMap(editor: Editor) {
  return editor.handleSelect.selectIdMap
}

export function getSelectIdList(editor: Editor) {
  return editor.handleSelect.selectIdList.filter((id) => editor.yState.state[id])
}

export function getSelectPageId(editor: Editor) {
  return editor.handleSelect.selectPageId
}

export function getAllSelectIdMap(editor: Editor) {
  return {
    ...editor.handleSelect.selectIdMap,
    ...Object.values(editor.yClients.others).reduce((acc, client) => {
      return { ...acc, ...client.selectIdMap }
    }, {}),
  }
}

export function getSelectedNodes(editor: Editor) {
  return getSelectIdList(editor).map((id) => editor.yState.find<S.Node>(id))
}
