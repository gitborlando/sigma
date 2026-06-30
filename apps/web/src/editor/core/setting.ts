import { jsonFy, jsonParse } from '@gitborlando/utils'
import { defuOverrideArray } from '@sigma/utils/defu'
import { makeObservable } from 'mobx'
import { Service } from 'src/global/service'

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

export class EditorSettingService extends Service {
  @observable setting = initSetting()

  constructor() {
    super()
    autoBind(makeObservable(this))
    this.loadSetting()
    this.effect(this.autoSaveSetting())
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
