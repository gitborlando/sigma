import { MutableRefObject, Ref, useEffect, useRef } from 'react'

export function useUniformRef<T>(ref: Ref<T | null>) {
  const innerRef = useRef<T | null>(null)

  useEffect(() => {
    if (!ref) return

    if (typeof ref === 'function') {
      ref(innerRef.current)
    } else {
      ;(ref as MutableRefObject<T | null>).current = innerRef.current
    }
  }, [ref, innerRef.current])

  return innerRef
}
