import { HookOption, Signal } from '@gitborlando/signal'
import { NoopFunc } from '@gitborlando/utils'
import { useEffect, useRef, useState } from 'react'

export function useSignal<T extends unknown>(signal: Signal<T>) {
  return useSyncExternalStore(signal.hook, () => signal.value)
}

export function useEventSignal(signal: Signal<unknown>) {
  const last = useRef({})
  return useSyncExternalStore(
    (callback) =>
      signal.hook(() => {
        last.current = {}
        callback()
      }),
    () => last.current,
  )
}

export function useAutoSignal<T extends any>(init?: T, id?: string): Signal<T> {
  const signal = useRef(Signal.create(init))
  useHookSignal(signal.current)
  return signal.current
}

type ICallback<T> = (value: T, forceUpdate: NoopFunc) => any
export function useHookSignal<T>(signal: Signal<T>): T
export function useHookSignal<T>(signal: Signal<T>, option: HookOption): T
export function useHookSignal<T>(signal: Signal<T>, callback: ICallback<T>): T
export function useHookSignal<T>(
  signal: Signal<T>,
  option: HookOption,
  callback: ICallback<T>,
): T
export function useHookSignal<T>(
  signal: Signal<T>,
  option?: HookOption | ICallback<T>,
  callback?: ICallback<T>,
) {
  const [_, setState] = useState({})
  const forceUpdate = () => setState({})

  useEffect(() => {
    if (callback) {
      return signal.hook(option as HookOption, (value) => {
        callback(value, forceUpdate)
      })
    }
    if (typeof option === 'function') {
      return signal.hook({}, (value) => {
        option(value, forceUpdate)
      })
    }
    return signal.hook(option || {}, forceUpdate)
  }, [])

  return signal.value
}
