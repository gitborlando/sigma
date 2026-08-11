import { Signal } from '@gitborlando/signal'
import { clone, ThisAsAny } from '@gitborlando/utils'
import { YPlain, type YPlainChange, type YPlainPatch } from '@gitborlando/y-plain'
import { createAtom } from 'mobx'
import { Y_STATE_LOCAL_ORIGIN } from 'src/global/constant'
import { Service } from 'src/global/service'
import * as Y from 'yjs'

export type YDocPatch = YPlainPatch

type YDocDownstream = (patches: YDocPatch[]) => void

@reflection
export class YDoc extends Service {
  yDoc!: Y.Doc
  plain!: YPlain<S.Doc>

  flushPatch$ = Signal.create<YDocPatch>()

  private patches: YDocPatch[] = []
  private downstream = new Set<YDocDownstream>()
  private stateAtom = createAtom('YDoc.observedDoc')

  constructor() {
    super()
    autoBind(this)
  }

  get observedDoc() {
    this.stateAtom.reportObserved()
    return this.plain.state
  }

  get doc() {
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

  setup(doc: S.Doc) {
    this.patches = []
    this.yDoc = new Y.Doc()
    this.effect(() => this.yDoc.destroy())
    this.plain = autoBind(new YPlain(this.yDoc.getMap<unknown>('doc'), doc))
    this.effect(this.plain.observe())
    this.effect(this.plain.subscribe(this.distribute))
  }

  transact(callback: () => void, origin = Y_STATE_LOCAL_ORIGIN) {
    this.plain.transact(origin, callback)
  }

  register(downstream: YDocDownstream) {
    this.downstream.add(downstream)
    return () => void this.downstream.delete(downstream)
  }

  onPatch(hook: (patches: YDocPatch) => void) {
    this.effect(this.flushPatch$.hook(hook))
  }

  getPatches() {
    const patches = [...this.patches]
    this.patches = []
    return patches
  }

  private distribute = ({ patches }: YPlainChange<S.Doc>) => {
    if (!patches.length) return
    isDEV && (ThisAsAny.doc = this.doc)

    this.patches.push(...clone(patches))
    this.downstream.forEach((handle) => handle(patches))
    patches.forEach((patch) => this.flushPatch$.dispatch(patch))

    this.stateAtom.reportChanged()
  }
}
