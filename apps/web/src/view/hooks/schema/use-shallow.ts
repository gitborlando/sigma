import { useRef } from 'react'

/**
 * Zustand shallow comparison function
 * This is the actual implementation from zustand/shallow
 */
export function shallow<T>(objA: T, objB: T) {
  if (Object.is(objA, objB)) {
    return true
  }
  if (
    typeof objA !== 'object' ||
    objA === null ||
    typeof objB !== 'object' ||
    objB === null
  ) {
    return false
  }

  if (objA instanceof Map && objB instanceof Map) {
    if (objA.size !== objB.size) return false

    for (const [key, value] of objA) {
      if (!Object.is(value, objB.get(key))) {
        return false
      }
    }
    return true
  }

  if (objA instanceof Set && objB instanceof Set) {
    if (objA.size !== objB.size) return false

    for (const value of objA) {
      if (!objB.has(value)) {
        return false
      }
    }
    return true
  }

  const keysA = Object.keys(objA)
  if (keysA.length !== Object.keys(objB).length) {
    return false
  }
  for (let i = 0; i < keysA.length; i++) {
    if (
      !Object.prototype.hasOwnProperty.call(objB, keysA[i] as string) ||
      !Object.is(
        (objA as any)[keysA[i] as string],
        (objB as any)[keysA[i] as string],
      )
    ) {
      return false
    }
  }
  return true
}

/**
 * Zustand useShallow hook
 * This wraps a selector to use shallow comparison
 */
export function useShallow<S, U>(selector: (state: S) => U): (state: S) => U {
  const prev = useRef<U>()

  return (state) => {
    const next = selector(state)
    return shallow(prev.current, next) ? (prev.current as U) : (prev.current = next)
  }
}
