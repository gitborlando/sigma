import { Signal } from '@gitborlando/signal'
import { Disposer } from '@gitborlando/toolkit/disposer'
import { clone, jsonParse } from '@gitborlando/utils'
import { YPlain, type YPlainChange, type YPlainPatch } from '@gitborlando/y-plain'
import JSZip from 'jszip'
import { Undo } from 'src/editor/core/undo'
import { SchemaHelper } from 'src/editor/schema/helper'
import { migrationSchema } from 'src/editor/schema/migration'
import { mock_transform_v } from 'src/editor/utils/mock/transfrom_v'
import { YClients } from 'src/editor/y-adapter/y-clients'
import { Y_STATE_LOCAL_ORIGIN } from 'src/global/constant'
import { FileService } from 'src/global/service/file'
import * as Y from 'yjs'

export type YStatePatch = YPlainPatch

type YStateListener = (patches: YStatePatch[]) => void

class YStateService {
  doc!: Y.Doc
  plain!: YPlain<S.Schema>

  inited$ = Signal.create(false)
  flushPatch$ = Signal.create<YStatePatch>()

  private listeners = new Set<YStateListener>()
  private accumulatePatches: YStatePatch[] = []
  private disposer = new Disposer()

  get schema() {
    return this.state
  }

  get state() {
    return this.plain.state
  }

  get insert() {
    return this.plain.insert
  }

  get set() {
    return this.plain.set
  }

  get replace() {
    return this.plain.replace
  }

  get delete() {
    return this.plain.delete
  }

  transact(callback: () => void, origin = Y_STATE_LOCAL_ORIGIN) {
    this.plain.transact(origin, callback)
  }

  find<T extends S.SchemaItem>(id: string): T {
    return this.state[id] as T
  }

  subscribe(listener: YStateListener) {
    this.listeners.add(listener)
    return () => void this.listeners.delete(listener)
  }

  getPatches() {
    const keyPatchMap = new Map<string, YStatePatch>()
    this.accumulatePatches.forEach((patch) => {
      const keyPath = patch.keys.join('.')
      const existingPatch = keyPatchMap.get(keyPath)
      if (existingPatch && 'value' in patch) {
        Object.assign(existingPatch, { value: clone(patch.value) })
        return
      }
      keyPatchMap.set(keyPath, clone(patch))
    })
    this.accumulatePatches = []
    return clone([...keyPatchMap.values()])
  }

  async initSchema(fileId: string) {
    let schema: S.Schema | undefined

    if (fileId === 'mock') {
      const mockSchema = mock_transform_v()
      if (mockSchema) schema = mockSchema
    } else {
      const fileMeta = await FileService.getFileMeta(fileId)
      if (fileMeta) {
        const jsZip = new JSZip()
        const zipBuffer = await FileService.loadFile(fileMeta.url)
        const zipFiles = await jsZip.loadAsync(zipBuffer)
        const fileText = await zipFiles
          .file(`${decodeURIComponent(fileMeta.name)}.json`)
          ?.async('text')
        schema = jsonParse(fileText) as S.Schema
      }
    }

    if (!schema) throw new Error('Failed to initialize YState schema')

    schema = migrationSchema(schema)

    this.dispose()
    this.doc = new Y.Doc()

    // YSync.init(fileId, this.doc)

    this.plain = autoBind(new YPlain(this.ySchema, schema))
    this.disposer.add(this.plain.observe())
    this.disposer.add(this.plain.subscribe(this.handlePlainChange))
    this.disposer.add(YClients.subscribe())

    YClients.clientId = this.doc.clientID
    Undo.initUndo({
      stateMap: this.ySchema as Y.Map<S.Schema>,
      getPatches: this.getPatches,
    })

    SchemaHelper.init({ find: YState.find })

    this.inited$.dispatch(true)
  }

  dispose() {
    if (this.inited$.value) this.doc.destroy()
    this.accumulatePatches = []
    this.inited$.value = false
    this.disposer.dispose()
  }

  private handlePlainChange = ({ patches }: YPlainChange<S.Schema>) => {
    if (!patches.length) return

    this.accumulatePatches.push(...clone(patches))
    this.listeners.forEach((listener) => listener(patches))

    if (!this.inited$.value) return
    patches.forEach((patch) => this.flushPatch$.dispatch(patch))
  }

  private get ySchema() {
    return this.doc.getMap('schema')
  }
}

export const YState = autoBind(new YStateService())
