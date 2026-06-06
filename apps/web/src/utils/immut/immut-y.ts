import * as Y from 'yjs'
import Immut from './immut'
import { initializeYFromI, subscribeI } from './json-to-y'
import type { Options } from './json-to-y'
import { initializeIFromY, subscribeY } from './y-to-immut'

export function bind(i: Immut, y: Y.Map<any>, opts: Options = {}): () => void {
  initializeIFromY(i, y)
  initializeYFromI(i, y, opts)

  const unsubscribeI = subscribeI(i, y, opts)
  const unsubscribeY = subscribeY(y, i)

  return () => {
    unsubscribeI()
    unsubscribeY()
  }
}
