import { useRef } from 'react'
import { shallow } from 'src/utils/shallow'

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
