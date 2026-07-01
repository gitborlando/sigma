import { Signal } from '@gitborlando/signal'
import { clone } from '@gitborlando/utils'
import { YPlain, type YPlainChange, type YPlainPatch } from '@gitborlando/y-plain'
import { Y_STATE_LOCAL_ORIGIN } from 'src/global/constant'
import { Service } from 'src/global/service'
import * as Y from 'yjs'

export type YStatePatch = YPlainPatch

type YStateListener = (patches: YStatePatch[]) => void

export class YStateService extends Service {
  doc!: Y.Doc
  plain!: YPlain<S.Schema>

  flushPatch$ = Signal.create<YStatePatch>()

  private listeners = new Set<YStateListener>()
  private accumulatePatches: YStatePatch[] = []

  constructor() {
    super()
    autoBind(this)
  }

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

  listen(listener: YStateListener) {
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

  init(schema: S.Schema) {
    this.doc = new Y.Doc()
    this.effect(() => this.doc.destroy())
    this.plain = autoBind(new YPlain(this.doc.getMap<unknown>('schema'), schema))
    this.effect(this.plain.observe())
    this.effect(this.plain.subscribe(this.handlePlainChange))
  }

  private handlePlainChange = ({ patches }: YPlainChange<S.Schema>) => {
    if (!patches.length) return

    this.accumulatePatches.push(...clone(patches))
    this.listeners.forEach((listener) => listener(patches))

    patches.forEach((patch) => this.flushPatch$.dispatch(patch))
  }
}
