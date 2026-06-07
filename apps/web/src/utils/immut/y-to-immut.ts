import * as Y from 'yjs'
import Immut from './immut'
import { deepEqual, getNestedValues, toJSON } from './json-to-y'

export function initializeIFromY(i: Immut, y: Y.Map<any>) {
  y.forEach((yv, k) => {
    if (!deepEqual(i.state[k], toJSON(yv))) {
      i.state[k] = toJSON(yv)
    }
  })
}

export function subscribeY(y: Y.Map<any>, i: Immut) {
  const joinPath = (path: (string | number)[], key: string | number) =>
    path.concat(key).join('.')

  const observer = (events: Y.YEvent<any>[]) => {
    events.forEach((event) => {
      const path = event.path
      const parent = getNestedValues(i.state, y, path)

      if (parent.y instanceof Y.Map) {
        event.changes.keys.forEach((item, k) => {
          if (item.action === 'delete') {
            const value = i.get(joinPath(path, k))
            if (value !== undefined) {
              i.delete(joinPath(path, k))
            }
          } else {
            const yv = toJSON(parent.y.get(k))
            if (!deepEqual(yv, parent.o[k])) {
              i.set(joinPath(path, k), yv)
            }
          }
        })
      } else if (parent.y instanceof Y.Array) {
        if (deepEqual(parent.o, toJSON(parent.y))) {
          return
        }

        let retain = 0
        event.changes.delta.forEach((item) => {
          if (item.retain) {
            retain += item.retain
          }
          if (item.delete) {
            i.delete(path.concat(retain).join('.'))
          }
          if (item.insert) {
            if (Array.isArray(item.insert)) {
              item.insert.forEach((yv, j) => {
                i.set(joinPath(path, retain + j), toJSON(yv))
              })
            } else {
              i.set(joinPath(path, retain), toJSON(item.insert))
            }
            retain += item.insert.length
          }
        })
      }
    })
    i.next()
  }

  y.observeDeep(observer)
  return () => y.unobserveDeep(observer)
}
