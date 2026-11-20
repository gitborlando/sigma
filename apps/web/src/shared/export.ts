import { mergeWith } from 'es-toolkit'

export const mergeOverrideArray = <
  T extends Record<PropertyKey, any>,
  S extends Record<PropertyKey, any>,
>(
  target: T,
  source: S,
) =>
  mergeWith(target, source, (_, sourceValue) => {
    if (Array.isArray(sourceValue)) return sourceValue
  })

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

type TryFunction = {
  <T>(
    promise: Promise<T> | (() => Promise<T>),
    error?: (e: Error) => void,
    final?: () => void,
  ): Promise<readonly [T, undefined] | readonly [undefined, Error]>
  throwError: (error: Error) => never
}

const runTry = async <T>(
  promise: Promise<T> | (() => Promise<T>),
  error?: (e: Error) => void,
  final?: () => void,
) => {
  try {
    return [
      await (typeof promise === 'function' ? promise() : promise),
      undefined,
    ] as const
  } catch (e) {
    const caught = e instanceof Error ? e : new Error(String(e))
    error?.(caught)
    return [undefined, caught] as const
  } finally {
    final?.()
  }
}

export const Try: TryFunction = Object.assign(runTry, {
  throwError: (error: Error): never => {
    throw error
  },
})
