import * as Y from 'yjs'

const NON_SERIALIZABLE_ERROR = new Error('YPlain value must be serializable')

type AnyObject = Record<string, any>
type YPlainPrimitive = string | number | boolean | bigint | symbol | null | undefined
type YPlainDepthKey = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
type YPlainDepth = [never, 0, 1, 2, 3, 4, 5, 6]

function deepEqual(a: any, b: any) {
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

  if ((a === undefined || a === null) && b === null) return true

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

const toYValue = (value: any) => {
  if (value === undefined) return undefined

  if (isArray(value)) {
    const array = new Y.Array()
    array.insert(
      0,
      value.map(toYValue).filter((item) => item !== undefined),
    )
    return array
  }

  if (isObject(value)) {
    const map = new Y.Map()
    Object.entries(value).forEach(([key, child]) => {
      const yValue = toYValue(child)
      if (yValue !== undefined) map.set(key, yValue)
    })
    return map
  }

  if (isPrimitiveValue(value)) return value

  throw NON_SERIALIZABLE_ERROR
}

const toJSON = (value: unknown) =>
  value instanceof Y.AbstractType ? value.toJSON() : value

export type YPlainPathKey = string | number
export type YPlainPath = readonly YPlainPathKey[]
export type YPlainPathPattern = string

export type YPlainTypedPath<T, Depth extends YPlainDepthKey = 6> = [Depth] extends [
  never,
]
  ? // Keep accepting paths after the recursive budget is exhausted.
    YPlainPath
  : T extends YPlainPrimitive
    ? never
    : T extends readonly (infer Item)[]
      ? readonly [number] | YPlainNestedPath<number, Item, YPlainDepth[Depth]>
      : T extends AnyObject
        ? {
            [K in keyof T & YPlainPathKey]:
              | readonly [K]
              | YPlainNestedPath<K, T[K], YPlainDepth[Depth]>
          }[keyof T & YPlainPathKey]
        : never

export type YPlainPathValue<T, P extends YPlainPath> = P extends readonly []
  ? T
  : P extends readonly [infer Key, ...infer Rest extends YPlainPath]
    ? T extends readonly (infer Item)[]
      ? Key extends number
        ? YPlainPathValue<Item, Rest>
        : never
      : Key extends keyof T
        ? YPlainPathValue<T[Key], Rest>
        : T extends Record<string, infer Value>
          ? Key extends string
            ? YPlainPathValue<Value, Rest>
            : never
          : never
    : T

export type YPlainInsertValue<T, P extends YPlainPath> = P extends readonly [
  ...infer Parent extends YPlainPath,
  infer Key,
]
  ? Key extends number
    ? YPlainPathValue<T, Parent> extends readonly (infer Item)[]
      ? Item
      : never
    : YPlainPathValue<T, P> extends readonly (infer Item)[]
      ? Item
      : never
  : T extends readonly (infer Item)[]
    ? Item
    : never

type YPlainNestedPath<
  Key extends YPlainPathKey,
  Value,
  Depth extends YPlainDepthKey,
> =
  YPlainTypedPath<Value, Depth> extends infer Tail
    ? Tail extends YPlainPath
      ? readonly [Key, ...Tail]
      : never
    : never

export type YPlainPatch =
  | {
      type: 'add'
      keys: YPlainPath
      value: any
    }
  | {
      type: 'remove'
      keys: YPlainPath
      oldValue: any
    }
  | {
      type: 'replace'
      keys: YPlainPath
      value: any
      oldValue: any
    }

export type YPlainChange<T extends AnyObject = AnyObject> = {
  state: T
  patches: YPlainPatch[]
  origin: unknown
  transaction: Y.Transaction
}

export type YPlainListener<T extends AnyObject = AnyObject> = (
  change: YPlainChange<T>,
) => void

export class YPlain<T extends AnyObject = AnyObject> {
  private plainState: T
  private listeners = new Set<YPlainListener<T>>()
  private observeCount = 0

  constructor(
    private yMap: Y.Map<unknown>,
    initialState?: T,
  ) {
    this.plainState = yMap.toJSON() as T
    if (initialState !== undefined && !this.replaceYMapState(initialState)) {
      throw new Error('YPlain initialState must be serializable')
    }
  }

  get state() {
    return this.plainState
  }

  getState = () => this.plainState

  setState = (state: T) => this.replaceYMapState(state)

  transact = <R>(fn: () => R, origin?: unknown) => {
    const { doc } = this.yMap
    if (!doc) return fn()

    let result!: R
    doc.transact(() => {
      result = fn()
    }, origin)

    return result
  }

  subscribe = (listener: YPlainListener<T>) => {
    this.listeners.add(listener)
    return () => void this.listeners.delete(listener)
  }

  observe = () => {
    let disposed = false

    if (this.observeCount === 0) this.yMap.observeDeep(this.handleObserve)
    this.observeCount += 1

    return () => {
      if (disposed) return

      disposed = true
      this.observeCount -= 1
      if (this.observeCount === 0) this.yMap.unobserveDeep(this.handleObserve)
    }
  }

  get = <const P extends YPlainTypedPath<T>>(path: P) =>
    getPlainValue(this.plainState, path) as YPlainPathValue<T, P>

  getY = <const P extends YPlainTypedPath<T>>(path: P) => this.getYValue(path)

  insert = <const P extends YPlainTypedPath<T>>(
    path: P,
    value: YPlainInsertValue<T, P>,
  ) => {
    const key = path[path.length - 1]
    const hasIndex = isYPlainArrayIndex(key)
    const target = hasIndex
      ? this.getYValue(path.slice(0, -1))
      : this.getYValue(path)

    if (!(target instanceof Y.Array)) return false

    const result = tryToYValue(value)
    if (!result.ok || result.value === undefined) return false

    const index = hasIndex ? clampIndex(key, target.length) : target.length
    target.insert(index, [result.value])
    return true
  }

  set = <const P extends YPlainTypedPath<T>>(
    path: P,
    value: YPlainPathValue<T, P> | undefined,
  ) => {
    if (value === undefined) return this.delete(path)

    const target = this.getYParent(path)
    if (!target) return false

    const { parent, key } = target
    const result = tryToYValue(value)
    if (!result.ok || result.value === undefined) return false

    if (parent instanceof Y.Map) {
      if (!isYPlainMapKey(key)) return false

      parent.set(key, result.value)
      return true
    }

    if (!(parent instanceof Y.Array)) return false

    if (!isValidArrayIndex(parent, key)) return false

    transactY(parent, () => {
      parent.delete(key, 1)
      parent.insert(key, [result.value])
    })
    return true
  }

  replace = <const P extends YPlainTypedPath<T>>(
    path: P,
    value: YPlainPathValue<T, P> | undefined,
  ) => {
    const target = this.getYParent(path)
    if (!target) return false

    const { parent, key } = target

    if (parent instanceof Y.Map) {
      if (!isYPlainMapKey(key) || !parent.has(key)) return false
      if (value === undefined) parent.delete(key)
      else {
        const result = tryToYValue(value)
        if (!result.ok || result.value === undefined) return false
        parent.set(key, result.value)
      }
      return true
    }

    if (!(parent instanceof Y.Array)) return false

    if (!isValidArrayIndex(parent, key)) return false

    if (value === undefined) {
      parent.delete(key, 1)
      return true
    }

    const result = tryToYValue(value)
    if (!result.ok || result.value === undefined) return false

    transactY(parent, () => {
      parent.delete(key, 1)
      parent.insert(key, [result.value])
    })
    return true
  }

  delete = <const P extends YPlainTypedPath<T>>(path: P) => {
    const target = this.getYParent(path)
    if (!target) return false

    const { parent, key } = target

    if (parent instanceof Y.Map) {
      if (!isYPlainMapKey(key) || !parent.has(key)) return false

      parent.delete(key)
      return true
    }

    if (!(parent instanceof Y.Array)) return false

    if (!isValidArrayIndex(parent, key)) return false

    parent.delete(key, 1)
    return true
  }

  private handleObserve = (
    events: Y.YEvent<Y.Map<unknown> | Y.Array<unknown>>[],
    transaction: Y.Transaction,
  ) => {
    const patches: YPlainPatch[] = []
    let nextState = this.plainState

    events.forEach((event) => {
      const result = projectYEvent(nextState, event)
      nextState = result.state as T
      patches.push(...result.patches)
    })

    if (patches.length === 0) return

    this.plainState = nextState
    const change = {
      state: this.plainState,
      patches,
      origin: transaction.origin,
      transaction,
    }
    this.listeners.forEach((listener) => listener(change))
  }

  private replaceYMapState = (state: T) => {
    const entries: [string, unknown][] = []

    for (const [key, value] of Object.entries(state)) {
      const result = tryToYValue(value)
      if (!result.ok) return false
      if (result.value !== undefined) entries.push([key, result.value])
    }

    transactY(this.yMap, () => {
      this.yMap.clear()
      entries.forEach(([key, value]) => this.yMap.set(key, value))
    })

    this.plainState = this.yMap.toJSON() as T
    return true
  }

  private getYValue(path: YPlainPath) {
    let current: unknown = this.yMap

    path.forEach((key) => {
      if (current instanceof Y.Map && isYPlainMapKey(key)) {
        current = current.get(key)
      } else if (current instanceof Y.Array && isYPlainArrayIndex(key)) {
        current = current.get(key)
      } else {
        current = undefined
      }
    })

    return current
  }

  private getYParent(path: YPlainPath) {
    const key = path[path.length - 1]
    if (!isYPlainPathKey(key)) return undefined

    return {
      parent: this.getYValue(path.slice(0, -1)),
      key,
    }
  }
}

export function joinYPlainPath(path: YPlainPath) {
  return path.join('.')
}

export function projectYEvent<T extends AnyObject>(
  state: T,
  event: Y.YEvent<Y.Map<unknown> | Y.Array<unknown>>,
) {
  if (event.target instanceof Y.Map) {
    return projectYMapEvent(state, event as Y.YMapEvent<unknown>)
  }

  if (event.target instanceof Y.Array) {
    return projectYArrayEvent(state, event as Y.YArrayEvent<unknown>)
  }

  return { state, patches: [] }
}

function projectYMapEvent<T extends AnyObject>(
  state: T,
  event: Y.YMapEvent<unknown>,
) {
  const patches: YPlainPatch[] = []
  let nextState = state

  event.changes.keys.forEach((change, key) => {
    const keys = event.path.concat(key)
    const existed = hasPlainValue(nextState, keys)
    const oldValue = getPlainValue(nextState, keys)

    if (change.action === 'delete') {
      if (!existed) return

      nextState = deletePlainValue(nextState, keys)
      patches.push({ type: 'remove', keys, oldValue })
      return
    }

    const value = toJSON(event.target.get(key))
    if (existed && deepEqual(value, oldValue)) return

    nextState = setPlainValue(nextState, keys, value)
    patches.push({
      type: existed ? 'replace' : 'add',
      keys,
      value,
      oldValue,
    })
  })

  return { state: nextState, patches }
}

function projectYArrayEvent<T extends AnyObject>(
  state: T,
  event: Y.YArrayEvent<unknown>,
) {
  const oldArray = getPlainValue(state, event.path)
  const nextArray = Array.isArray(oldArray) ? [...oldArray] : []
  const patches: YPlainPatch[] = []
  let index = 0
  let pendingRemove: { index: number; values: any[] } | undefined

  const flushRemove = () => {
    pendingRemove?.values.forEach((oldValue, offset) => {
      patches.push({
        type: 'remove',
        keys: event.path.concat(pendingRemove!.index + offset),
        oldValue,
      })
    })
    pendingRemove = undefined
  }

  event.changes.delta.forEach((change) => {
    if (change.retain) {
      flushRemove()
      index += change.retain
    }

    if (change.delete) {
      flushRemove()
      pendingRemove = {
        index,
        values: nextArray.splice(index, change.delete),
      }
    }

    if (change.insert) {
      const values = normalizeArrayInsert(change.insert)
      nextArray.splice(index, 0, ...values)

      if (pendingRemove && pendingRemove.index === index) {
        pushReplacePatches(patches, event.path, pendingRemove.values, values, index)
        pendingRemove = undefined
      } else {
        flushRemove()
        values.forEach((value, offset) => {
          patches.push({
            type: 'add',
            keys: event.path.concat(index + offset),
            value,
          })
        })
      }

      index += values.length
    }
  })

  flushRemove()

  if (patches.length === 0 || deepEqual(oldArray, nextArray)) {
    return { state, patches: [] }
  }

  return {
    state: setPlainValue(state, event.path, nextArray),
    patches,
  }
}

function pushReplacePatches(
  patches: YPlainPatch[],
  path: YPlainPath,
  oldValues: any[],
  values: any[],
  index: number,
) {
  const replaceCount = Math.min(oldValues.length, values.length)

  for (let i = 0; i < replaceCount; i++) {
    patches.push({
      type: 'replace',
      keys: path.concat(index + i),
      value: values[i],
      oldValue: oldValues[i],
    })
  }

  oldValues.slice(replaceCount).forEach((oldValue, offset) => {
    patches.push({
      type: 'remove',
      keys: path.concat(index + replaceCount + offset),
      oldValue,
    })
  })

  values.slice(replaceCount).forEach((value, offset) => {
    patches.push({
      type: 'add',
      keys: path.concat(index + replaceCount + offset),
      value,
    })
  })
}

function normalizeArrayInsert(value: unknown) {
  const values = Array.isArray(value) ? value : [value]
  return values.map(toJSON)
}

function getPlainValue(root: unknown, keys: YPlainPath) {
  let current: any = root

  keys.forEach((key) => {
    current = current?.[key]
  })

  return current
}

function hasPlainValue(root: unknown, keys: YPlainPath) {
  let current: any = root

  for (const key of keys) {
    if (current == null) return false

    if (Array.isArray(current)) {
      if (!isYPlainArrayIndex(key) || key >= current.length) return false
    } else if (typeof current === 'object') {
      if (!isYPlainMapKey(key)) return false
      if (!Object.prototype.hasOwnProperty.call(current, key)) return false
    } else {
      return false
    }

    current = current[key]
  }

  return true
}

function setPlainValue<T>(root: T, keys: YPlainPath, value: unknown): T {
  if (keys.length === 0) return value as T

  const nextRoot = clonePlainContainer(root, keys[0])
  let current: any = nextRoot
  let previous: any = root

  keys.slice(0, -1).forEach((key, index) => {
    const nextKey = keys[index + 1]
    const child = previous?.[key]
    const nextChild = clonePlainContainer(child, nextKey)

    current[key] = nextChild
    current = nextChild
    previous = child
  })

  const lastKey = keys[keys.length - 1]
  if (isYPlainPathKey(lastKey)) current[lastKey] = value

  return nextRoot as T
}

function deletePlainValue<T>(root: T, keys: YPlainPath): T {
  if (keys.length === 0) return undefined as T

  const nextRoot = clonePlainContainer(root, keys[0])
  let current: any = nextRoot
  let previous: any = root

  keys.slice(0, -1).forEach((key, index) => {
    const nextKey = keys[index + 1]
    const child = previous?.[key]
    const nextChild = clonePlainContainer(child, nextKey)

    current[key] = nextChild
    current = nextChild
    previous = child
  })

  const lastKey = keys[keys.length - 1]
  if (Array.isArray(current)) {
    if (isYPlainArrayIndex(lastKey)) current.splice(lastKey, 1)
    return nextRoot as T
  }

  if (isYPlainMapKey(lastKey)) delete current[lastKey]

  return nextRoot as T
}

function clonePlainContainer(value: unknown, nextKey: unknown) {
  if (Array.isArray(value)) return [...value]
  if (value && typeof value === 'object') return { ...value }
  return isYPlainArrayIndex(nextKey) ? [] : {}
}

function clampIndex(index: number, length: number) {
  return Math.min(Math.max(index, 0), length)
}

function transactY(type: Y.AbstractType<any>, fn: () => void) {
  const { doc } = type
  if (doc) doc.transact(fn)
  else fn()
}

function tryToYValue(value: unknown) {
  try {
    return { ok: true as const, value: toYValue(value) }
  } catch (error) {
    if (error === NON_SERIALIZABLE_ERROR) return { ok: false as const }
    throw error
  }
}

function isYPlainPathKey(key: unknown): key is YPlainPathKey {
  return isYPlainMapKey(key) || isYPlainArrayIndex(key)
}

function isYPlainMapKey(key: unknown): key is string {
  return typeof key === 'string'
}

function isYPlainArrayIndex(key: unknown): key is number {
  return typeof key === 'number' && Number.isInteger(key) && key >= 0
}

function isValidArrayIndex(
  array: Y.Array<unknown>,
  index: YPlainPathKey,
): index is number {
  return isYPlainArrayIndex(index) && index < array.length
}
