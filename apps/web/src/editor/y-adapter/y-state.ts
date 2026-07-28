import { Signal } from '@gitborlando/signal'
import { clone, ThisAsAny } from '@gitborlando/utils'
import { YPlain, type YPlainChange, type YPlainPatch } from '@gitborlando/y-plain'
import { createAtom } from 'mobx'
import { Y_STATE_LOCAL_ORIGIN } from 'src/global/constant'
import { Service } from 'src/global/service'
import * as Y from 'yjs'

export type YStatePatch = YPlainPatch

type YStateDownstream = (patches: YStatePatch[]) => void

@reflection
export class YState extends Service {
  doc!: Y.Doc
  plain!: YPlain<S.Schema>

  flushPatch$ = Signal.create<YStatePatch>()

  private patches: YStatePatch[] = []
  private downstream = new Set<YStateDownstream>()
  private stateAtom = createAtom('YState.observedState')

  constructor() {
    super()
    autoBind(this)
  }

  get observedState() {
    this.stateAtom.reportObserved()
    return this.plain.state
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

  register(downstream: YStateDownstream) {
    this.downstream.add(downstream)
    return () => void this.downstream.delete(downstream)
  }

  setup(schema: S.Schema) {
    this.patches = []
    this.doc = new Y.Doc()
    this.effect(() => this.doc.destroy())
    this.plain = autoBind(new YPlain(this.doc.getMap<unknown>('schema'), schema))
    this.effect(this.plain.observe())
    this.effect(this.plain.subscribe(this.distribute))
  }

  getPatches() {
    const patches = [...this.patches]
    this.patches = []
    return patches
  }

  private distribute = ({ patches }: YPlainChange<S.Schema>) => {
    if (!patches.length) return
    isDEV && (ThisAsAny.schema = this.state)

    this.patches.push(...clone(patches))
    this.downstream.forEach((handle) => handle(patches))
    patches.forEach((patch) => this.flushPatch$.dispatch(patch))

    this.stateAtom.reportChanged()
  }
}
