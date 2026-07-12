import * as Y from 'yjs'

const NON_SERIALIZABLE_ERROR = new Error('YPlain value must be serializable')
const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor'])

type AnyObject = Record<string, any>
type YPlainPrimitive = string | number | boolean | null
type YPlainDepthKey = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
type YPlainDepth = [never, 0, 1, 2, 3, 4, 5, 6]

function deepEqual(a: any, b: any) {
  if (a === b) return true
  if (a !== a && b !== b) return true

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }

  if (isPlainObject(a) || isPlainObject(b)) {
    if (!isPlainObject(a) || !isPlainObject(b)) return false

    const keys = Object.keys(a)
    if (keys.length !== Object.keys(b).length) return false

    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false
      if (!deepEqual(a[key], b[key])) return false
    }
    return true
  }

  return false
}

const isArray = (x: unknown): x is unknown[] => Array.isArray(x)

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null) return false

  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

const isPrimitiveValue = (v: unknown) =>
  v === null ||
  typeof v === 'string' ||
  typeof v === 'number' ||
  typeof v === 'boolean'

const toYValue = (value: any) => {
  if (isPrimitiveValue(value)) return value

  if (isArray(value)) {
    const array = new Y.Array()
    const children = []

    for (let index = 0; index < value.length; index++) {
      if (!Object.prototype.hasOwnProperty.call(value, index)) {
        throw NON_SERIALIZABLE_ERROR
      }
      children.push(toYValue(value[index]))
    }

    array.insert(0, children)
    return array
  }

  if (isPlainObject(value)) {
    const map = new Y.Map()
    Object.entries(value).forEach(([key, child]) => {
      if (!isYPlainMapKey(key)) throw NON_SERIALIZABLE_ERROR
      map.set(key, toYValue(child))
    })
    return map
  }

  throw NON_SERIALIZABLE_ERROR
}

const fromYValue = (value: unknown): unknown => {
  if (value instanceof Y.Map) {
    const record: AnyObject = {}
    value.forEach((child, key) => {
      if (isYPlainMapKey(key)) record[key] = fromYValue(child)
    })
    return record
  }

  if (value instanceof Y.Array) return value.toArray().map(fromYValue)
  if (value instanceof Y.AbstractType) throw NON_SERIALIZABLE_ERROR

  if (isArray(value)) {
    const children = []

    for (let index = 0; index < value.length; index++) {
      if (!Object.prototype.hasOwnProperty.call(value, index)) {
        throw NON_SERIALIZABLE_ERROR
      }
      children.push(fromYValue(value[index]))
    }

    return children
  }

  if (isPlainObject(value)) {
    const record: AnyObject = {}
    Object.entries(value).forEach(([key, child]) => {
      if (isYPlainMapKey(key)) record[key] = fromYValue(child)
    })
    return record
  }

  if (isPrimitiveValue(value)) return value
  throw NON_SERIALIZABLE_ERROR
}

const toJSON = fromYValue

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

export type YPlainRecordPath<T, Depth extends YPlainDepthKey = 6> =
  | readonly [string]
  | readonly [string, ...YPlainTypedPath<T, Depth>]

export type YPlainRecordPathValue<T, P extends YPlainPath> = P extends readonly [
  string,
]
  ? T
  : P extends readonly [string, ...infer Rest extends YPlainPath]
    ? YPlainPathValue<T, Rest>
    : never

export type YPlainRecordInsertValue<T, P extends YPlainPath> = P extends readonly [
  string,
]
  ? T extends readonly (infer Item)[]
    ? Item
    : never
  : P extends readonly [string, ...infer Rest extends YPlainPath]
    ? YPlainInsertValue<T, Rest>
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
  | { type: 'add'; keys: YPlainPath; value: any }
  | { type: 'remove'; keys: YPlainPath; oldValue: any }
  | { type: 'replace'; keys: YPlainPath; value: any; oldValue: any }

export type YPlainChange<T extends AnyObject = AnyObject> = {
  state: T
  patches: YPlainPatch[]
  origin: unknown
  transaction?: Y.Transaction
}

export type YPlainListener<T extends AnyObject = AnyObject> = (
  change: YPlainChange<T>,
) => void

type YPlainTransact = { <R>(fn: () => R): R; <R>(origin: unknown, fn: () => R): R }

export class YPlain<T extends AnyObject = AnyObject> {
  private plainState: T
  private listeners = new Set<YPlainListener<T>>()
  private observeCount = 0
  private transactionDepth = 0
  private pendingProjectionPatches: YPlainPatch[] = []
  private pendingNotifyPatches: YPlainPatch[] = []
  private pendingTransaction?: Y.Transaction
  private pendingOrigin: unknown

  constructor(
    private yMap: Y.Map<unknown>,
    initialState?: T,
  ) {
    this.plainState = toJSON(yMap) as T
    if (initialState !== undefined && !this.replaceYMapState(initialState)) {
      throw new Error('YPlain initialState must be serializable')
    }
  }

  get state() {
    this.flushProjection()
    return this.plainState
  }

  getState = () => this.state

  setState = (state: T) => this.runMutation(() => this.replaceYMapState(state, true))

  transact: YPlainTransact = <R>(...args: [() => R] | [unknown, () => R]) => {
    const [origin, fn] = args.length === 1 ? [undefined, args[0]] : args

    if (this.transactionDepth > 0) return fn()

    const { doc } = this.yMap
    this.beginTransaction(origin)

    try {
      if (!doc) return fn()

      let result!: R
      doc.transact(() => {
        result = fn()
      }, origin)
      return result
    } finally {
      this.endTransaction()
    }
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

  get<const P extends YPlainTypedPath<T>>(path: P): YPlainPathValue<T, P>
  get<Item, const P extends YPlainRecordPath<Item> = YPlainRecordPath<Item>>(
    path: P,
  ): YPlainRecordPathValue<Item, P>
  get(path: YPlainPath) {
    return getPlainValue(this.state, path)
  }

  getY<const P extends YPlainTypedPath<T>>(path: P): unknown
  getY<Item, const P extends YPlainRecordPath<Item> = YPlainRecordPath<Item>>(
    path: P,
  ): unknown
  getY(path: YPlainPath) {
    return this.getYValue(path)
  }

  insert<const P extends YPlainTypedPath<T>>(
    path: P,
    value: YPlainInsertValue<T, P>,
  ): boolean
  insert<Item, const P extends YPlainRecordPath<Item> = YPlainRecordPath<Item>>(
    path: P,
    value: YPlainRecordInsertValue<Item, P>,
  ): boolean
  insert(path: YPlainPath, value: unknown) {
    return this.runMutation(() => this.insertYPath(path, value))
  }

  private insertYPath(path: YPlainPath, value: unknown) {
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
    this.enqueuePatches([
      {
        type: 'add',
        keys: (hasIndex ? path.slice(0, -1) : path).concat(index),
        value: toJSON(result.value),
      },
    ])
    return true
  }

  set<const P extends YPlainTypedPath<T>>(
    path: P,
    value: YPlainPathValue<T, P> | undefined,
  ): boolean
  set<Item, const P extends YPlainRecordPath<Item> = YPlainRecordPath<Item>>(
    path: P,
    value: YPlainRecordPathValue<Item, P> | undefined,
  ): boolean
  set(path: YPlainPath, value: unknown) {
    return this.runMutation(() => this.setYPath(path, value))
  }

  private setYPath(path: YPlainPath, value: unknown) {
    if (value === undefined) return this.deleteYPath(path)

    const target = this.getYParent(path)
    if (!target) return false

    const { parent, key } = target
    const result = tryToYValue(value)
    if (!result.ok || result.value === undefined) return false

    if (parent instanceof Y.Map) {
      if (!isYPlainMapKey(key)) return false

      const existed = parent.has(key)
      const oldValue = existed ? toJSON(parent.get(key)) : undefined
      parent.set(key, result.value)
      const nextValue = toJSON(result.value)
      if (!existed || !deepEqual(nextValue, oldValue)) {
        this.enqueuePatches([
          existed
            ? { type: 'replace', keys: path, value: nextValue, oldValue }
            : { type: 'add', keys: path, value: nextValue },
        ])
      }
      return true
    }

    if (!(parent instanceof Y.Array)) return false

    if (!isValidArrayIndex(parent, key)) return false

    const oldValue = toJSON(parent.get(key))
    transactY(parent, () => {
      parent.delete(key, 1)
      parent.insert(key, [result.value])
    })
    const nextValue = toJSON(result.value)
    if (!deepEqual(nextValue, oldValue)) {
      this.enqueuePatches([
        { type: 'replace', keys: path, value: nextValue, oldValue },
      ])
    }
    return true
  }

  replace<const P extends YPlainTypedPath<T>>(
    path: P,
    value: YPlainPathValue<T, P> | undefined,
  ): boolean
  replace<Item, const P extends YPlainRecordPath<Item> = YPlainRecordPath<Item>>(
    path: P,
    value: YPlainRecordPathValue<Item, P> | undefined,
  ): boolean
  replace(path: YPlainPath, value: unknown) {
    return this.runMutation(() => this.replaceYPath(path, value))
  }

  private replaceYPath(path: YPlainPath, value: unknown) {
    const target = this.getYParent(path)
    if (!target) return false

    const { parent, key } = target

    if (parent instanceof Y.Map) {
      if (!isYPlainMapKey(key) || !parent.has(key)) return false
      const oldValue = toJSON(parent.get(key))
      if (value === undefined) parent.delete(key)
      else {
        const result = tryToYValue(value)
        if (!result.ok || result.value === undefined) return false
        parent.set(key, result.value)
        const nextValue = toJSON(result.value)
        if (!deepEqual(nextValue, oldValue)) {
          this.enqueuePatches([
            { type: 'replace', keys: path, value: nextValue, oldValue },
          ])
        }
        return true
      }
      this.enqueuePatches([{ type: 'remove', keys: path, oldValue }])
      return true
    }

    if (!(parent instanceof Y.Array)) return false

    if (!isValidArrayIndex(parent, key)) return false
    const oldValue = toJSON(parent.get(key))

    if (value === undefined) {
      parent.delete(key, 1)
      this.enqueuePatches([{ type: 'remove', keys: path, oldValue }])
      return true
    }

    const result = tryToYValue(value)
    if (!result.ok || result.value === undefined) return false

    transactY(parent, () => {
      parent.delete(key, 1)
      parent.insert(key, [result.value])
    })
    const nextValue = toJSON(result.value)
    if (!deepEqual(nextValue, oldValue)) {
      this.enqueuePatches([
        { type: 'replace', keys: path, value: nextValue, oldValue },
      ])
    }
    return true
  }

  delete<const P extends YPlainTypedPath<T>>(path: P): boolean
  delete<Item, const P extends YPlainRecordPath<Item> = YPlainRecordPath<Item>>(
    path: P,
  ): boolean
  delete(path: YPlainPath) {
    return this.runMutation(() => this.deleteYPath(path))
  }

  private deleteYPath(path: YPlainPath) {
    const target = this.getYParent(path)
    if (!target) return false

    const { parent, key } = target

    if (parent instanceof Y.Map) {
      if (!isYPlainMapKey(key) || !parent.has(key)) return false

      const oldValue = toJSON(parent.get(key))
      parent.delete(key)
      this.enqueuePatches([{ type: 'remove', keys: path, oldValue }])
      return true
    }

    if (!(parent instanceof Y.Array)) return false

    if (!isValidArrayIndex(parent, key)) return false

    const oldValue = toJSON(parent.get(key))
    parent.delete(key, 1)
    this.enqueuePatches([{ type: 'remove', keys: path, oldValue }])
    return true
  }

  private handleObserve = (
    events: Y.YEvent<Y.Map<unknown> | Y.Array<unknown>>[],
    transaction: Y.Transaction,
  ) => {
    this.flushProjection()

    const patches: YPlainPatch[] = []
    let nextState = this.plainState

    events.forEach((event) => {
      const result =
        this.transactionDepth > 0
          ? projectYTransactionEvent(nextState, event)
          : projectYEvent(nextState, event)
      nextState = result.state as T
      patches.push(...result.patches)
    })

    if (this.transactionDepth > 0) {
      this.pendingTransaction = transaction
      if (patches.length > 0) {
        this.plainState = nextState
        this.pendingNotifyPatches.push(...patches)
      }
      return
    }

    if (patches.length === 0) return

    this.plainState = nextState
    const change = {
      state: this.plainState,
      patches,
      origin: transaction.origin,
      transaction,
    }
    notifyListeners(this.listeners, change)
  }

  private replaceYMapState = (state: T, notify = false) => {
    if (!isPlainObject(state)) return false

    const entries: [string, unknown][] = []

    for (const [key, value] of Object.entries(state)) {
      if (!isYPlainMapKey(key)) return false
      const result = tryToYValue(value)
      if (!result.ok) return false
      entries.push([key, result.value])
    }

    const oldState = notify ? this.state : undefined

    transactY(this.yMap, () => {
      this.yMap.clear()
      entries.forEach(([key, value]) => this.yMap.set(key, value))
    })

    const nextState = toJSON(this.yMap) as T
    if (!notify) {
      this.plainState = nextState
      return true
    }

    this.enqueuePatches(diffPlainObject([], oldState, nextState))
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

    return { parent: this.getYValue(path.slice(0, -1)), key }
  }

  private runMutation(callback: () => boolean) {
    if (this.transactionDepth > 0) return callback()
    return this.transact(callback)
  }

  private beginTransaction(origin: unknown) {
    if (this.transactionDepth === 0) this.pendingOrigin = origin
    this.transactionDepth += 1
  }

  private endTransaction() {
    this.transactionDepth -= 1
    if (this.transactionDepth > 0) return

    try {
      this.flushProjection()
      this.flushNotify()
    } finally {
      this.pendingOrigin = undefined
      this.pendingTransaction = undefined
    }
  }

  private enqueuePatches(patches: YPlainPatch[]) {
    if (patches.length === 0) return
    this.pendingProjectionPatches.push(...patches)
    this.pendingNotifyPatches.push(...patches)
  }

  private flushProjection() {
    if (this.pendingProjectionPatches.length === 0) return
    this.plainState = applyPlainPatches(
      this.plainState,
      this.pendingProjectionPatches,
    )
    this.pendingProjectionPatches = []
  }

  private flushNotify() {
    if (this.pendingNotifyPatches.length === 0) return

    const change = {
      state: this.plainState,
      patches: this.pendingNotifyPatches,
      origin: this.pendingTransaction?.origin ?? this.pendingOrigin,
      transaction: this.pendingTransaction,
    }
    this.pendingNotifyPatches = []
    notifyListeners(this.listeners, change)
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

function projectYTransactionEvent<T extends AnyObject>(
  state: T,
  event: Y.YEvent<Y.Map<unknown> | Y.Array<unknown>>,
) {
  if (event.target instanceof Y.Array) {
    return projectYArraySnapshotEvent(state, event as Y.YArrayEvent<unknown>)
  }

  return projectYEvent(state, event)
}

function projectYMapEvent<T extends AnyObject>(
  state: T,
  event: Y.YMapEvent<unknown>,
) {
  const patches: YPlainPatch[] = []
  let nextState = state

  event.changes.keys.forEach((change, key) => {
    const keys = event.path.concat(key)
    if (!isSafePlainPath(keys)) return

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
    patches.push(
      existed
        ? { type: 'replace', keys, value, oldValue }
        : { type: 'add', keys, value },
    )
  })

  return { state: nextState, patches }
}

function projectYArrayEvent<T extends AnyObject>(
  state: T,
  event: Y.YArrayEvent<unknown>,
) {
  if (!isSafePlainPath(event.path)) return { state, patches: [] }

  const oldArray = getPlainValue(state, event.path)
  const nextArray = Array.isArray(oldArray) ? [...oldArray] : []
  const patches: YPlainPatch[] = []
  let index = 0
  let pendingRemove: { index: number; values: any[] } | undefined

  const flushRemove = () => {
    pendingRemove?.values.forEach((oldValue) => {
      patches.push({
        type: 'remove',
        keys: event.path.concat(pendingRemove!.index),
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
      pendingRemove = { index, values: nextArray.splice(index, change.delete) }
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

  return { state: setPlainValue(state, event.path, nextArray), patches }
}

function projectYArraySnapshotEvent<T extends AnyObject>(
  state: T,
  event: Y.YArrayEvent<unknown>,
) {
  if (!isSafePlainPath(event.path)) return { state, patches: [] }

  const oldArray = getPlainValue(state, event.path)
  const nextArray = toJSON(event.target)
  if (!Array.isArray(nextArray) || deepEqual(oldArray, nextArray)) {
    return { state, patches: [] }
  }

  return {
    state: setPlainValue(state, event.path, nextArray),
    patches: diffPlainArray(
      event.path,
      Array.isArray(oldArray) ? oldArray : [],
      nextArray,
    ),
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

  oldValues.slice(replaceCount).forEach((oldValue) => {
    patches.push({
      type: 'remove',
      keys: path.concat(index + replaceCount),
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

function notifyListeners<T extends AnyObject>(
  listeners: Set<YPlainListener<T>>,
  change: YPlainChange<T>,
) {
  const errors: unknown[] = []

  for (const listener of [...listeners]) {
    try {
      listener(change)
    } catch (error) {
      errors.push(error)
    }
  }

  if (errors.length === 1) throw errors[0]
  if (errors.length > 1) throw new AggregateError(errors, 'YPlain listeners failed')
}

function normalizeArrayInsert(value: unknown) {
  const values = Array.isArray(value) ? value : [value]
  return values.map(toJSON)
}

function diffPlainArray(path: YPlainPath, oldArray: any[], nextArray: any[]) {
  const patches: YPlainPatch[] = []
  let start = 0

  while (
    start < oldArray.length &&
    start < nextArray.length &&
    deepEqual(oldArray[start], nextArray[start])
  ) {
    start += 1
  }

  let oldEnd = oldArray.length
  let nextEnd = nextArray.length

  while (
    oldEnd > start &&
    nextEnd > start &&
    deepEqual(oldArray[oldEnd - 1], nextArray[nextEnd - 1])
  ) {
    oldEnd -= 1
    nextEnd -= 1
  }

  pushReplacePatches(
    patches,
    path,
    oldArray.slice(start, oldEnd),
    nextArray.slice(start, nextEnd),
    start,
  )

  return patches
}

function getPlainValue(root: unknown, keys: YPlainPath) {
  let current: any = root

  for (const key of keys) {
    if (!isYPlainPathKey(key)) return undefined
    current = current?.[key]
  }

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

function diffPlainObject(
  path: YPlainPath,
  oldValue: unknown,
  nextValue: Record<string, unknown>,
) {
  const patches: YPlainPatch[] = []
  const oldObject = isPlainObject(oldValue) ? oldValue : {}

  Object.keys(oldObject).forEach((key) => {
    if (!isYPlainMapKey(key)) return
    if (!Object.prototype.hasOwnProperty.call(nextValue, key)) {
      patches.push({
        type: 'remove',
        keys: path.concat(key),
        oldValue: oldObject[key],
      })
    }
  })

  Object.entries(nextValue).forEach(([key, value]) => {
    if (!isYPlainMapKey(key)) return

    const keys = path.concat(key)
    if (!Object.prototype.hasOwnProperty.call(oldObject, key)) {
      patches.push({ type: 'add', keys, value })
      return
    }

    const oldChild = oldObject[key]
    if (!deepEqual(value, oldChild)) {
      patches.push({ type: 'replace', keys, value, oldValue: oldChild })
    }
  })

  return patches
}

function applyPlainPatches<T>(state: T, patches: YPlainPatch[]) {
  return patches.reduce((nextState, patch) => {
    if (patch.type === 'add') {
      return insertPlainValue(nextState, patch.keys, patch.value)
    }
    if (patch.type === 'replace') {
      return setPlainValue(nextState, patch.keys, patch.value)
    }
    return deletePlainValue(nextState, patch.keys)
  }, state)
}

function insertPlainValue<T>(root: T, keys: YPlainPath, value: unknown): T {
  if (keys.length === 0) return value as T
  if (!isSafePlainPath(keys)) return root

  const parent = getPlainValue(root, keys.slice(0, -1))
  const lastKey = keys[keys.length - 1]
  if (!Array.isArray(parent) || !isYPlainArrayIndex(lastKey)) {
    return setPlainValue(root, keys, value)
  }

  const nextRoot = clonePlainContainer(root, keys[0])
  let current: any = nextRoot
  let previous: any = root

  keys.slice(0, -1).forEach((key, index) => {
    const nextKey = keys[index + 1]
    const child = previous?.[key]
    const nextChild =
      index === keys.length - 2
        ? [...(child || [])]
        : clonePlainContainer(child, nextKey)

    current[key] = nextChild
    current = nextChild
    previous = child
  })

  current.splice(lastKey, 0, value)
  return nextRoot as T
}

function setPlainValue<T>(root: T, keys: YPlainPath, value: unknown): T {
  if (keys.length === 0) return value as T
  if (!isSafePlainPath(keys)) return root

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
  if (!isSafePlainPath(keys)) return root

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
  if (isPlainObject(value)) return { ...value }
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
  return typeof key === 'string' && !UNSAFE_KEYS.has(key)
}

function isSafePlainPath(path: YPlainPath) {
  return path.every(isYPlainPathKey)
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
