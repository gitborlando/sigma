import * as Y from 'yjs'
import Immut from './immut'
import type { Options } from './json-to-y'
import { initializeYFromI } from './json-to-y'
import { initializeIFromY, subscribeY } from './y-to-immut'

export function bind(i: Immut, y: Y.Map<any>, opts: Options = {}) {
  initializeIFromY(i, y)
  initializeYFromI(i, y, opts)

  const unsubscribeY = subscribeY(y, i)

  return () => {
    unsubscribeY()
  }
}
