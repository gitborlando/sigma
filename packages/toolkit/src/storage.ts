import { merge } from 'es-toolkit'
import type { ZodType } from 'zod'

type StoragePartial<T> = T extends readonly (infer Item)[]
  ? StoragePartial<Item>[]
  : T extends object
    ? { [Key in keyof T]?: StoragePartial<T[Key]> }
    : T

type StorageLike = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const getLocalStorage = () =>
  (globalThis as { localStorage?: StorageLike }).localStorage

const storageJsonCache = new Map<string, unknown>()

export const readStorage = (key: string) => {
  if (storageJsonCache.has(key)) return storageJsonCache.get(key)

  const storage = getLocalStorage()
  if (!storage) return

  try {
    const text = storage.getItem(key)
    if (!text) return

    const value = JSON.parse(text) as unknown
    storageJsonCache.set(key, value)
    return value
  } catch {
    storage.removeItem(key)
    storageJsonCache.delete(key)
  }
}

export const writeStorage = (key: string, value: unknown) => {
  getLocalStorage()?.setItem(key, JSON.stringify(value))
  storageJsonCache.delete(key)
}

export const createZodStorage = <T>(key: string, schema: ZodType<T>) => {
  return {
    read() {
      const result = schema.safeParse(readStorage(key))
      if (!result.success) return
      return result.data
    },
    save(value: T) {
      const result = schema.safeParse(value)
      if (!result.success) return false
      writeStorage(key, result.data)
      return true
    },
    savePartial(value: StoragePartial<T>) {
      const fallback = Array.isArray(value) ? [] : {}
      const nextValue = merge(
        (this.read() ?? fallback) as never,
        value as never,
      ) as T
      return this.save(nextValue)
    },
  }
}
