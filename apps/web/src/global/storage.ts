import { StorageUtil } from '@gitborlando/utils/browser'

export const Storage = new StorageUtil()

export function createStorageItem<T>(key: string, init: T) {
  const signal = Signal.create<T>(init)
  const setting = Storage.get<T>(key)

  if (setting !== undefined) {
    signal.value = setting
  } else {
    Storage.set(key, init)
  }

  signal.hook((newValue) => Storage.set(key, newValue))

  return signal
}
