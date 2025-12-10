import { jsonFy, jsonParse } from '@gitborlando/utils'
import { Matrix } from 'src/editor/math/matrix'
import { defuOverrideArray } from 'src/utils/defu'

const initSetting = () => {
  return {
    autosave: true,
    showFPS: true,
    devMode: false,
    ignoreUnVisible: true,
    needSliceRender: true,
    showDirtyRect: false,
    fullRender: false,
    dev: {
      fixedSceneMatrix: true,
      sceneMatrix: Matrix.identity().tuple(),
    },
    snapToGrid: false,
  }
}

class EditorSettingService {
  inited = Signal.create(false)
  @observable setting = initSetting()

  init() {
    this.loadSetting()
    this.autoSaveSetting()
    this.inited.dispatch(true)
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

export function getEditorSetting() {
  return EditorSetting.setting
}
