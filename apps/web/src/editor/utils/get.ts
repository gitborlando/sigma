import type { EditorService2 } from '..'

export function getZoom(editor: EditorService2) {
  return editor.stageViewport.zoom
}

export function getSetting(editor: EditorService2) {
  return editor.editorSetting.setting
}

export function getSelectIdMap(editor: EditorService2) {
  return editor.handleSelect.selectIdMap
}

export function getSelectIdList(editor: EditorService2) {
  return editor.handleSelect.selectIdList.filter((id) => editor.yState.state[id])
}

export function getSelectPageId(editor: EditorService2) {
  return editor.handleSelect.selectPageId
}

export function getAllSelectIdMap(editor: EditorService2) {
  return {
    ...editor.handleSelect.selectIdMap,
    ...Object.values(editor.yClients.others).reduce((acc, client) => {
      return { ...acc, ...client.selectIdMap }
    }, {}),
  }
}

export function getSelectedNodes(editor: EditorService2) {
  return getSelectIdList(editor).map((id) => editor.yState.find<S.Node>(id))
}
