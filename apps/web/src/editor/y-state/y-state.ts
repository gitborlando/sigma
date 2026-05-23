import autobind from 'class-autobind-decorator'
import Immut, { ImmutPatch } from 'src/utils/immut/immut'
import { bind } from 'src/utils/immut/immut-y'
import * as Y from 'yjs'

@autobind
class YStateService {
  doc!: Y.Doc
  immut = new Immut(<S.Schema>{})

  inited$ = Signal.create(false)
  flushPatch$ = Signal.create<ImmutPatch>()

  private unSub?: () => void

  get schema() {
    return this.immut.state
  }
  get state() {
    return this.immut.state
  }
  get insert() {
    return this.immut.insert
  }
  get set() {
    return this.immut.set
  }
  get delete() {
    return this.immut.delete
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
  get applyImmerPatches() {
    return this.immut.applyImmerPatches
  }

  find<T extends S.SchemaItem>(id: string): T {
    return this.state[id] as T
  }

  setProp(path: string, payload: Record<string, any>) {
    Object.entries(payload).forEach(([key, value]) => {
      this.set(`${path}.${key}`, value)
    })
  }

  async initSchema(fileId: string, mockSchema?: S.Schema) {
    this.doc = new Y.Doc()

    // YSync.init(fileId, this.doc)

    this.immut.state = mockSchema!
    bind(this.immut, this.doc.getMap('schema'))

    this.unSub?.()
    this.unSub = this.flushPatch()

    YClients.clientId = this.doc.clientID
    YUndo.initStateUndo(this.doc.getMap('schema'))

    this.inited$.dispatch(true)
  }

  private flushPatch() {
    return this.immut.subscribe((patches: ImmutPatch[]) => {
      if (!this.inited$.value) return
      patches.forEach((patch) => this.flushPatch$.dispatch(patch))
    })
  }
}

export const YState = new YStateService()
