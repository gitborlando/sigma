import { flushFuncs } from '@gitborlando/utils'
import autobind from 'class-autobind-decorator'
import { EditorSetting } from 'src/editor/editor/setting'
import { INoopFunc } from 'src/shared/utils/normal'
import Immui, { ImmuiApplyPatchOption, ImmuiPatch } from '../../shared/immui/immui'
import { SchemaHistory } from './history'
import {
  IClient,
  ID,
  IMeta,
  INodeOrPage,
  ISchemaOperation,
  ISchemaPropKey,
} from './type'

type ICommitOperationOption = Partial<ISchemaOperation> & {
  noHistory?: boolean
}

@autobind
class SchemaService {
  schema!: S.Schema
  inited = Signal.create(false)
  operationList = <ISchemaOperation[]>[]
  private immui = new Immui()

  get meta() {
    return this.find<IMeta>('meta')
  }
  get client() {
    return this.find<IClient>('client')
  }

  initSchema(schema: S.Schema) {
    this.schema = schema
    this.inited.dispatch(true)
  }

  find<T extends S.SchemaItem>(id: ID): T {
    return YState.find<any>(id)
    // return this.schema[id] as T
  }

  addItem(item: INodeOrPage) {
    this.immui.add(this.schema, [item.id], item)
  }

  removeItem(item: INodeOrPage) {
    this.immui.delete(this.schema, [item.id])
  }

  itemAdd(item: S.SchemaItem, keypath: ISchemaPropKey[], value: any) {
    this.immui.add(this.schema, [item.id, ...keypath], value)
  }

  itemReset(item: S.SchemaItem, keypath: ISchemaPropKey[], value: any) {
    this.immui.reset(this.schema, [item.id, ...keypath], value)
  }

  itemDelete(item: S.SchemaItem, keypath: ISchemaPropKey[]) {
    this.immui.delete(this.schema, [item.id, ...keypath])
  }

  applyPatches(patches: ImmuiPatch[], option?: ImmuiApplyPatchOption) {
    this.immui.applyPatches(this.schema, patches, option)
  }

  commitOperation(description: string, option?: ICommitOperationOption) {
    return
  }

  finalOperation(description: string, option?: ICommitOperationOption) {
    this.commitOperation(description, option)
    this.commitHistory(description)
  }

  flushingPatches = Signal.create<ImmuiPatch>()
  schemaChanged = Signal.create<ImmuiPatch[]>()
  private matchPatchFuncs = new Set<INoopFunc>()

  nextSchema() {
    const [schema, patches] = this.immui.next(this.schema)
    this.schema = schema
    SchemaHistory.patchList.push(...patches)
    patches.forEach(this.flushingPatches.dispatch)
    flushFuncs(this.matchPatchFuncs)
    this.schemaChanged.dispatch(patches)
  }

  commitHistory(description: string) {
    this.nextSchema()
    SchemaHistory.commit(description)
  }

  private produceMatchPatten(patten: string) {
    const pattenList = <string[]>[]
    const splitReg = /(?<=\/)[^\/]+\|[^\/]+(?=\/?)/
    if (splitReg.test(patten)) {
      const splitItems = patten.match(splitReg)![0].split('|')
      for (const splitItem of splitItems) {
        pattenList.push(patten.replace(splitReg, () => splitItem))
      }
    } else {
      pattenList.push(patten)
    }
    return pattenList.map((patten) => patten.split('/').filter(Boolean))
  }

  onMatchPatch(patten: string, callback: INoopFunc) {
    return this.produceMatchPatten(patten).map((pattenKeys) => {
      return this.flushingPatches.hook((patch) => {
        if (!Immui.matchPath(patch.keys, pattenKeys)) return
        this.matchPatchFuncs.add(callback)
      })
    })
  }

  save = (patches: ImmuiPatch[], reverse?: boolean) => {
    if (!EditorSetting.setting.autosave) return
    // this.saveWorker.postMessage({ patches, reverse })
  }
}

export const Schema = new SchemaService()
