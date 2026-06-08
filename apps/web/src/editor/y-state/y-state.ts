import { clone } from '@gitborlando/utils'
import autobind from 'class-autobind-decorator'
import type { Patch } from 'immer'
import Immut, { ImmutPatch } from 'src/utils/immut/immut'
import { bind } from 'src/utils/immut/immut-y'
import { toYValue } from 'src/utils/immut/json-to-y'
import * as Y from 'yjs'

@autobind
class YStateService {
  doc?: Y.Doc
  immut = new Immut(<S.Schema>{})

  inited$ = Signal.create(false)
  flushPatch$ = Signal.create<ImmutPatch>()

  private unbind?: () => void
  private unSub?: () => void

  get schema() {
    return this.immut.state
  }
  get state() {
    return this.immut.state
  }
  get next() {
    return this.immut.next
  }
  get subscribe() {
    return this.immut.subscribe
  }
  get getPatches() {
    return this.immut.getPatches
  }
  transact(callback: () => void, origin?: unknown) {
    const run = () => {
      callback()
      this.immut.next()
    }

    if (!this.doc) {
      run()
      return
    }

    this.doc.transact(run, origin)
  }

  find<T extends S.SchemaItem>(id: string): T {
    return this.state[id] as T
  }

  insert<T>(keyPath: string, value: T) {
    if (this.doc) this.insertYValue(keyPath, value)
    this.immut.insert(keyPath, value)
  }

  set<T>(keyPath: string, value: T) {
    if (this.doc) this.setYValue(keyPath, value)
    this.immut.set(keyPath, value)
  }

  delete(keyPath: string) {
    if (this.doc) this.deleteYValue(keyPath)
    this.immut.delete(keyPath)
  }

  setProp(path: string, payload: Record<string, any>) {
    Object.entries(payload).forEach(([key, value]) => {
      this.set(`${path}.${key}`, value)
    })
  }

  applyImmerPatches(patches: Patch[], prefix: string) {
    const prefixes = prefix.split('.') as (string | number)[]
    patches.forEach((patch) => {
      const keys = prefixes.concat(patch.path)
      const keyPath = keys.join('.')

      switch (patch.op) {
        case 'add':
          if (!Number.isNaN(Number(keys[keys.length - 1]))) {
            this.insert(keyPath, clone(patch.value))
          } else {
            this.set(keyPath, clone(patch.value))
          }
          return
        case 'replace':
          return this.set(keyPath, clone(patch.value))
        case 'remove':
          return this.delete(keyPath)
      }
    })
  }

  async initSchema(fileId: string, mockSchema?: S.Schema) {
    this.dispose()
    this.doc = new Y.Doc()

    // YSync.init(fileId, this.doc)

    this.immut.state = mockSchema!
    this.unbind = bind(this.immut, this.doc.getMap('schema'))
    this.unSub = this.flushPatch()

    YClients.clientId = this.doc.clientID
    YUndo.initStateUndo(this.doc.getMap('schema'))

    this.inited$.dispatch(true)
  }

  dispose() {
    this.inited$.value = false
    this.unbind?.()
    this.unbind = undefined
    this.unSub?.()
    this.unSub = undefined
    this.doc?.destroy()
    this.doc = undefined
  }

  private flushPatch() {
    return this.immut.subscribe((patches: ImmutPatch[]) => {
      if (!this.inited$.value) return
      patches.forEach((patch) => this.flushPatch$.dispatch(patch))
    })
  }

  private get ySchema() {
    return this.doc!.getMap('schema')
  }

  private getYValue(keys: (string | number)[]) {
    let current: unknown = this.ySchema
    keys.forEach((key) => {
      if (current instanceof Y.Map) current = current.get(String(key))
      else if (current instanceof Y.Array) current = current.get(Number(key))
      else current = undefined
    })
    return current
  }

  private getYParent(keyPath: string) {
    const keys = keyPath.split(/\.|\//) as (string | number)[]
    const lastKey = keys[keys.length - 1]
    return {
      parent: this.getYValue(keys.slice(0, -1)),
      lastKey,
    }
  }

  private insertYValue<T>(keyPath: string, value: T) {
    const keys = keyPath.split(/\.|\//) as (string | number)[]
    const lastIndex = Number(keys[keys.length - 1])
    const isIndexPath = !Number.isNaN(lastIndex)
    const target = isIndexPath
      ? this.getYValue(keys.slice(0, -1))
      : this.getYValue(keys)
    const index =
      isIndexPath && target instanceof Y.Array
        ? Math.min(Math.max(lastIndex, 0), target.length)
        : target instanceof Y.Array
          ? target.length
          : 0
    if (!(target instanceof Y.Array)) return

    const yValue = toYValue(value)
    if (yValue !== undefined) target.insert(index, [yValue])
  }

  private setYValue<T>(keyPath: string, value: T) {
    const { parent, lastKey } = this.getYParent(keyPath)
    const yValue = toYValue(value)

    if (parent instanceof Y.Map) {
      if (yValue === undefined) parent.delete(String(lastKey))
      else parent.set(String(lastKey), yValue)
      return
    }

    if (!(parent instanceof Y.Array)) return
    const index = Number(lastKey)
    if (Number.isNaN(index)) return
    if (index >= 0 && index < parent.length) parent.delete(index, 1)
    if (yValue !== undefined) {
      parent.insert(Math.min(Math.max(index, 0), parent.length), [yValue])
    }
  }

  private deleteYValue(keyPath: string) {
    const { parent, lastKey } = this.getYParent(keyPath)

    if (parent instanceof Y.Map) {
      parent.delete(String(lastKey))
      return
    }

    if (!(parent instanceof Y.Array)) return
    const index = Number(lastKey)
    if (!Number.isNaN(index) && index >= 0 && index < parent.length) {
      parent.delete(index, 1)
    }
  }
}

export const YState = new YStateService()
