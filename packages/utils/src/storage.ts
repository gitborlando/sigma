type StorageLike = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const getLocalStorage = () =>
  (globalThis as { localStorage?: StorageLike }).localStorage

const storageJsonCache = new Map<string, unknown>()

export const readStorageJson = (key: string) => {
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

export const writeStorageJson = (key: string, value: unknown) => {
  getLocalStorage()?.setItem(key, JSON.stringify(value))
  storageJsonCache.delete(key)
}
