type StorageLike = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const getLocalStorage = () =>
  (globalThis as { localStorage?: StorageLike }).localStorage

export const readStorageJson = (key: string) => {
  const storage = getLocalStorage()
  if (!storage) return

  try {
    const text = storage.getItem(key)
    return text ? (JSON.parse(text) as unknown) : undefined
  } catch {
    storage.removeItem(key)
  }
}

export const writeStorageJson = (key: string, value: unknown) => {
  getLocalStorage()?.setItem(key, JSON.stringify(value))
}
