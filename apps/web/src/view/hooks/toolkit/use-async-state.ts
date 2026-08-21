import { useEffect, useState } from 'react'

export const useAsyncState = <T>(initialState: T, getState: () => Promise<T>) => {
  const [state, setState] = useState(initialState)

  useEffect(() => {
    getState().then(setState).catch(console.error)
  }, [getState])

  return [state, setState] as const
}
