import { jsonFy, jsonParse } from '@gitborlando/utils'
import { defuOverrideArray } from '@sigma/utils/defu'
import { reflection } from 'first-di'
import { makeObservable } from 'mobx'
import { Service } from 'src/global/service'

const initSetting = () => ({
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
})

export interface SettingService extends ReturnType<typeof initSetting> {}

@reflection
export class SettingService extends Service {
  @observable private settings = initSetting()

  constructor() {
    super()
    autoBind(makeObservable(this))
    this.loadSetting()
    this.effect(this.autoSaveSetting())

    return new Proxy(this, {
      get: (target, key, receiver) => {
        if (Reflect.has(target, key)) return Reflect.get(target, key, receiver)
        if (Reflect.has(target.settings, key))
          return Reflect.get(target.settings, key)
      },
      set: (target, key, value, receiver) => {
        if (Reflect.has(target, key)) {
          return Reflect.set(target, key, value, receiver)
        }
        if (Reflect.has(target.settings, key)) {
          return Reflect.set(target.settings, key, value)
        }
        return Reflect.set(target, key, value, receiver)
      },
      has: (target, key) =>
        Reflect.has(target, key) || Reflect.has(target.settings, key),
      ownKeys: (target) => [
        ...new Set([
          ...Reflect.ownKeys(target),
          ...Reflect.ownKeys(target.settings),
        ]),
      ],
      getOwnPropertyDescriptor: (target, key) => {
        const descriptor = Reflect.getOwnPropertyDescriptor(target, key)
        if (descriptor) return descriptor
        if (!Reflect.has(target.settings, key)) return

        return {
          configurable: true,
          enumerable: true,
          get: () => Reflect.get(target.settings, key),
          set: (value) => Reflect.set(target.settings, key, value),
        }
      },
    })
  }

  private loadSetting() {
    const savedSetting = jsonParse(localStorage.getItem('editor.setting'))
    this.settings = defuOverrideArray(savedSetting, initSetting())
  }

  private autoSaveSetting() {
    return reaction(
      () => jsonFy(this.settings),
      (json) => localStorage.setItem('editor.setting', json || ''),
    )
  }
}
