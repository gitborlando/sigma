import { jsonFy, jsonParse } from '@gitborlando/utils'
import { defuOverrideArray } from '@sigma/utils/defu'
import { EditorService } from '..'

const initSetting = () => {
  return {
    autosave: true,
    showFPS: true,
    devMode: isDEV,
    ignoreUnVisible: true,
    needSliceRender: true,
    showDirtyRect: false,
    fullRender: false,
    snapToGrid: false,
    dev: {
      logUndoRedoInfo: false,
    },
  }
}

export class EditorSettingService extends EditorService {
  @observable setting = initSetting()

  subscribe() {
    this.loadSetting()
    return this.autoSaveSetting()
  }

  private loadSetting() {
    const savedSetting = jsonParse(localStorage.getItem('editor.setting'))
    this.setting = defuOverrideArray(savedSetting, initSetting())
  }

  private autoSaveSetting() {
    return reaction(
      () => jsonFy(this.setting),
      (json) => localStorage.setItem('editor.setting', json || ''),
    )
  }
}
