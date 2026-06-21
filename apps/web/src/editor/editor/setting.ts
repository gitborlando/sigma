import { jsonFy, jsonParse } from '@gitborlando/utils'
import { defuOverrideArray } from '@sigma/utils/defu'

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

class EditorSettingService {
  @observable setting = initSetting()

  init() {
    this.loadSetting()
    this.autoSaveSetting()
  }

  private loadSetting() {
    const savedSetting = jsonParse(localStorage.getItem('editor.setting'))
    this.setting = defuOverrideArray(savedSetting, initSetting())
  }

  private autoSaveSetting() {
    reaction(
      () => jsonFy(this.setting),
      (json) => localStorage.setItem('editor.setting', json || ''),
    )
  }
}

export const EditorSetting = autoBind(makeObservable(new EditorSettingService()))
