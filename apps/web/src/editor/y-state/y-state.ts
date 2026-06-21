import { clone, jsonParse } from '@gitborlando/utils'
import type { Patch } from 'immer'
import JSZip from 'jszip'
import { mock_transform_v } from 'src/editor/editor/mock/transfrom_v'
import { SchemaHelper } from 'src/editor/schema/helper'
import { migrationSchema } from 'src/editor/schema/migration'
import { FileService } from 'src/global/service/file'
import Immut, { ImmutPatch } from 'src/utils/immut/immut'
import { bind } from 'src/utils/immut/immut-y'
import { toYValue } from 'src/utils/immut/json-to-y'
import * as Y from 'yjs'

const jsZip = new JSZip()

class YStateService {
  doc?: Y.Doc
  immut = new Immut(<S.Schema>{})

  inited$ = Signal.create(false)
  flushPatch$ = Signal.create<ImmutPatch>()

  private unbind?: () => void
  private unSub?: () => void
  private transactionDepth = 0
  private disposer = new Disposer()

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
      this.transactionDepth += 1
      try {
        callback()
      } finally {
        this.transactionDepth -= 1
      }
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
    const nextKeyPath = this.normalizeInsertPath(keyPath)
    if (!nextKeyPath) return

    if (this.doc) this.insertYValue(nextKeyPath, value)
    if (!this.doc || this.transactionDepth > 0) {
      this.immut.insert(nextKeyPath, value)
    }
  }

  set<T>(keyPath: string, value: T) {
    if (value === undefined) return this.delete(keyPath)

    const nextKeyPath = this.normalizeSetPath(keyPath)
    if (!nextKeyPath) return

    if (this.doc) this.setYValue(nextKeyPath, value)
    if (!this.doc || this.transactionDepth > 0) {
      this.immut.set(nextKeyPath, value)
    }
  }

  delete(keyPath: string) {
    const nextKeyPath = this.normalizeDeletePath(keyPath)
    if (!nextKeyPath) return

    if (this.doc) this.deleteYValue(nextKeyPath)
    if (!this.doc || this.transactionDepth > 0) {
      this.immut.delete(nextKeyPath)
    }
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

  async initSchema(fileId: string) {
    let schema: S.Schema | undefined

    if (fileId === 'mock') {
      let mockSchema = mock_transform_v()
      if (mockSchema) schema = mockSchema
    } else {
      const fileMeta = await FileService.getFileMeta(fileId)
      if (fileMeta) {
        const zipBuffer = await FileService.loadFile(fileMeta.url)
        const zipFiles = await jsZip.loadAsync(zipBuffer)
        const fileText = await zipFiles
          .file(`${decodeURIComponent(fileMeta.name)}.json`)
          ?.async('text')
        schema = jsonParse(fileText) as S.Schema
      }
    }

    if (!schema) return

    schema = migrationSchema(schema)

    this.dispose()
    this.doc = new Y.Doc()

    // YSync.init(fileId, this.doc)

    this.immut.state = schema!
    this.disposer.add(bind(this.immut, this.doc.getMap('schema')))
    this.disposer.add(this.flushPatch())
    this.disposer.add(YClients.subscribe())

    YClients.clientId = this.doc.clientID
    Undo.initUndo({
      stateMap: this.doc.getMap('schema'),
      getPatches: this.getPatches,
    })

    SchemaHelper.init({ find: YState.find })

    this.inited$.dispatch(true)
  }

  dispose() {
    this.inited$.value = false
    this.doc?.destroy()
    this.doc = undefined
    this.disposer.dispose()
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

  private parseKeyPath(keyPath: string) {
    return keyPath.split(/\.|\//) as (string | number)[]
  }

  private joinKeyPath(keys: (string | number)[]) {
    return keys.join('.')
  }

  private getLocalValue(keys: (string | number)[]) {
    let current: any = this.immut.state
    for (const key of keys) {
      if (current === undefined || current === null) return undefined
      current = current[key]
    }
    return current
  }

  private getLocalParent(keyPath: string) {
    const keys = this.parseKeyPath(keyPath)
    const lastKey = keys[keys.length - 1]
    return {
      keys,
      parent: this.getLocalValue(keys.slice(0, -1)),
      lastKey,
    }
  }

  private normalizeInsertPath(keyPath: string) {
    const keys = this.parseKeyPath(keyPath)
    const lastIndex = Number(keys[keys.length - 1])

    if (Number.isNaN(lastIndex)) {
      const target = this.getLocalValue(keys)
      return Array.isArray(target) ? keyPath : undefined
    }

    const parent = this.getLocalValue(keys.slice(0, -1))
    if (!Array.isArray(parent)) return

    const index = Math.min(Math.max(lastIndex, 0), parent.length)
    return this.joinKeyPath([...keys.slice(0, -1), index])
  }

  private normalizeSetPath(keyPath: string) {
    const { keys, parent, lastKey } = this.getLocalParent(keyPath)

    if (Array.isArray(parent)) {
      const index = Number(lastKey)
      if (Number.isNaN(index) || index < 0 || index >= parent.length) return
      return this.joinKeyPath([...keys.slice(0, -1), index])
    }

    return parent && typeof parent === 'object' ? keyPath : undefined
  }

  private normalizeDeletePath(keyPath: string) {
    const { keys, parent, lastKey } = this.getLocalParent(keyPath)

    if (Array.isArray(parent)) {
      const index = Number(lastKey)
      if (Number.isNaN(index) || index < 0 || index >= parent.length) return
      return this.joinKeyPath([...keys.slice(0, -1), index])
    }

    if (!parent || typeof parent !== 'object') return
    return lastKey in parent ? keyPath : undefined
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
    const keys = this.parseKeyPath(keyPath)
    const lastKey = keys[keys.length - 1]
    return {
      parent: this.getYValue(keys.slice(0, -1)),
      lastKey,
    }
  }

  private insertYValue<T>(keyPath: string, value: T) {
    const keys = this.parseKeyPath(keyPath)
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

export const YState = autoBind(new YStateService())
