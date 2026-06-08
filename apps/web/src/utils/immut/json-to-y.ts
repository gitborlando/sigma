import * as Y from 'yjs'
import Immut from './immut'

const NON_SERIALIZABLE_ERROR = new Error('Proxy type must be serializable')

export type Options = {
  transactionOrigin?: any
}

export function deepEqual(a: any, b: any) {
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

export const transact = (doc: Y.Doc | null, opts: Options, fn: () => void) => {
  if (doc) {
    doc.transact(fn, opts.transactionOrigin)
  } else {
    fn()
  }
}

export const toYValue = (val: any) => {
  if (val === undefined) {
    return undefined
  }
  if (isArray(val)) {
    const arr = new Y.Array()
    arr.insert(
      0,
      val.map(toYValue).filter((v) => v !== undefined),
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

export const toJSON = (yv: unknown) => {
  if (yv instanceof Y.AbstractType) {
    return yv.toJSON()
  }

  return yv
}

export const getNestedValues = (
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

export function initializeYFromI(i: Immut, y: Y.Map<any>, opts: Options) {
  transact(y.doc, opts, () => {
    Object.entries(i.state).forEach(([k, pv]) => {
      const yv = y.get(k)
      if (!deepEqual(pv, toJSON(yv))) {
        insertIValueToY(pv, y, k)
      }
    })
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

export function subscribeI<T>(i: Immut, y: Y.Map<T>, opts: Options) {
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
            insertIValueToY(value, parent.y, Number(k))
          } else {
            parent.y.delete(Number(k), 1)
            insertIValueToY(value, parent.y, Number(k))
          }
        }
      })
    })
  })
}
