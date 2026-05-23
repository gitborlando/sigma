import * as Y from 'yjs'
import Immut from './immut'

const NON_SERIALIZABLE_ERROR = new Error('Proxy type must be serializable')

function deepEqual(a: any, b: any) {
  // Adapted from
  // https://github.com/epoberezkin/fast-deep-equal/blob/a8e7172/src/index.jst
  if (a === b) return true

  if (a && b && typeof a == 'object' && typeof b == 'object') {
    if (a.constructor !== b.constructor) return false

    if (Array.isArray(a)) {
      const length = a.length
      if (length != b.length) return false
      for (let i = length; i-- !== 0; ) if (!deepEqual(a[i], b[i])) return false
      return true
    }

    if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags
    if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf()
    if (a.toString !== Object.prototype.toString)
      return a.toString() === b.toString()

    const keys: string[] = Object.keys(a)
    const length = keys.length
    if (length !== Object.keys(b).length) return false

    for (let i = length; i-- !== 0; )
      if (!Object.prototype.hasOwnProperty.call(b, keys[i] as string)) return false

    for (let i = length; i-- !== 0; ) {
      const key = keys[i] as string

      if (!deepEqual(a[key], b[key])) return false
    }

    return true
  }

  // This case was added to support comparing YJS null values
  // against JavaScript null/undefined, as YJS doesn't support
  // undefined values.
  if ((a === undefined || a === null) && b === null) {
    return true
  }

  // true if both NaN, false otherwise
  return a !== a && b !== b
}

const isObject = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null

const isArray = (x: unknown): x is unknown[] => Array.isArray(x)

const isPrimitiveValue = (v: unknown) =>
  v === null ||
  typeof v === 'string' ||
  typeof v === 'number' ||
  typeof v === 'boolean'

type Options = {
  transactionOrigin?: any
}

const transact = (doc: Y.Doc | null, opts: Options, fn: () => void) => {
  if (doc) {
    doc.transact(fn, opts.transactionOrigin)
  } else {
    fn()
  }
}

const toYValue = (val: any) => {
  if (val === undefined) {
    return undefined
  }
  if (isArray(val)) {
    const arr = new Y.Array()
    arr.insert(
      0,
      val.map(toYValue).filter((v) => v !== undefined && v !== null),
    )
    return arr
  }
  if (isObject(val)) {
    const map = new Y.Map()
    Object.entries(val).forEach(([key, value]) => {
      const v = toYValue(value)
      if (v !== undefined) {
        map.set(key, v)
      }
    })
    return map
  }

  if (isPrimitiveValue(val)) {
    return val
  }

  throw NON_SERIALIZABLE_ERROR
}

const toJSON = (yv: unknown) => {
  if (yv instanceof Y.AbstractType) {
    return yv.toJSON()
  }

  return yv
}

const getNestedValues = (
  o: Record<string, any>,
  y: Y.Map<any>,
  path: (string | number)[],
) => {
  let ov: any = o
  let yv: any = y
  for (let i = 0; i < path.length; i += 1) {
    const k = path[i]
    if (yv instanceof Y.Map) {
      // child may already be deleted
      if (!ov) break
      ov = ov[k!]
      yv = yv.get(k as string)
    } else if (yv instanceof Y.Array) {
      // child may already be deleted
      if (!ov) break
      const index = Number(k)
      ov = ov[k!]
      yv = yv.get(index)
    } else {
      ov = null
      yv = null
    }
  }

  return { o: ov, y: yv }
}

export function bind(i: Immut, y: Y.Map<any>, opts: Options = {}): () => void {
  initializeFromY(i, y)
  initializeFromI(i, y, opts)

  const unsubscribeI = subscribeI(i, y, opts)
  const unsubscribeY = subscribeY(y, i)

  return () => {
    unsubscribeI()
    unsubscribeY()
  }
}

function initializeFromI(i: Immut, y: Y.Map<any>, opts: Options) {
  transact(y.doc, opts, () => {
    Object.entries(i.state).forEach(([k, pv]) => {
      const yv = y.get(k)
      if (!deepEqual(pv, toJSON(yv))) {
        insertIValueToY(pv, y, k)
      }
    })
  })
}

function initializeFromY(i: Immut, y: Y.Map<any>) {
  y.forEach((yv, k) => {
    if (!deepEqual(i.state[k], toJSON(yv))) {
      i.set(k, toJSON(yv))
    }
  })
}

function insertIValueToY(ov: any, y: Y.Map<any> | Y.Array<any>, k: number | string) {
  let yv
  try {
    yv = toYValue(ov)
  } catch (error: unknown) {
    if (error === NON_SERIALIZABLE_ERROR) {
      if (process.env.NODE_ENV !== 'production') {
      }
      return
    }
    throw error
  }

  if (y instanceof Y.Map && typeof k === 'string') {
    y.set(k, yv)
  } else if (y instanceof Y.Array && typeof k === 'number') {
    y.insert(k, [yv])
  }
}

function subscribeI<T>(i: Immut, y: Y.Map<T>, opts: Options) {
  return i.subscribe((ops) => {
    transact(y.doc, opts, () => {
      ops.forEach(({ keys, type, value }) => {
        const path = keys.slice(0, -1) as string[]
        const k = keys[keys.length - 1] as string
        const parent = getNestedValues(i.state, y, path)

        if (parent.y instanceof Y.Map) {
          if (type === 'remove') {
            parent.y.delete(k)
          } else {
            const ov = parent.o[k]
            const yv = parent.y.get(k)
            if (!deepEqual(ov, toJSON(yv))) {
              insertIValueToY(ov, parent.y, k)
            }
          }
        } else if (parent.y instanceof Y.Array) {
          if (deepEqual(parent.o, toJSON(parent.y))) {
            return
          }
          if (type === 'remove') {
            parent.y.delete(Number(k), 1)
          } else if (type === 'add') {
            parent.y.insert(Number(k), [value])
          } else {
            parent.y.delete(Number(k), 1)
            parent.y.insert(Number(k), [value])
          }
        }
      })
    })
  })
}

function subscribeY(y: Y.Map<any>, i: Immut) {
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
