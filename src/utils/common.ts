export function twoDecimal(number: number) {
  return Number(number.toFixed(Number.isInteger(number) ? 0 : 2))
}

export const foreachEqual = (a: any[], b: any[]) => {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

export const memorized = <F extends (deps: any[]) => any>(func: F) => {
  let value: ReturnType<F>
  let lastDeps: any[] | undefined

  return (deps: any[]) => {
    try {
      if (!lastDeps) return (value = func(deps))
      if (!foreachEqual(lastDeps, deps)) return (value = func(deps))
      return value
    } finally {
      lastDeps = deps
    }
  }
}

export function omitMut<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Omit<T, K> {
  for (const key of keys) {
    delete obj[key]
  }
  return obj as Omit<T, K>
}

export function logTime<T>(name: string, func: () => T) {
  const start = performance.now()
  const result = func()
  console.log(`${name}: ${performance.now() - start}ms`)
  return result
}
