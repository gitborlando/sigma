import { Signal } from '@gitborlando/signal'
import { clone, ThisAsAny } from '@gitborlando/utils'
import { YPlain, type YPlainChange, type YPlainPatch } from '@gitborlando/y-plain'
import { Y_STATE_LOCAL_ORIGIN } from 'src/global/constant'
import { Service } from 'src/global/service'
import * as Y from 'yjs'

export type YStatePatch = YPlainPatch

type YStateListener = (patches: YStatePatch[]) => void

@reflection
export class YState extends Service {
  doc!: Y.Doc
  plain!: YPlain<S.Schema>

  flushPatch$ = Signal.create<YStatePatch>()

  private patches: YStatePatch[] = []
  private listeners = new Set<YStateListener>()

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

  setup(schema: S.Schema) {
    this.patches = []
    this.doc = new Y.Doc()
    this.effect(() => this.doc.destroy())
    this.plain = autoBind(new YPlain(this.doc.getMap<unknown>('schema'), schema))
    this.effect(this.plain.observe())
    this.effect(this.plain.subscribe(this.handlePlainChange))
  }

  getPatches() {
    const patches = [...this.patches]
    this.patches = []
    return patches
  }

  private handlePlainChange = ({ patches }: YPlainChange<S.Schema>) => {
    if (!patches.length) return
    isDEV && (ThisAsAny.schema = this.state)

    this.patches.push(...clone(patches))
    this.listeners.forEach((listener) => listener(patches))

    patches.forEach((patch) => this.flushPatch$.dispatch(patch))
  }
}
