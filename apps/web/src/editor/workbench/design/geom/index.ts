import { objKeys } from '@gitborlando/utils'
import { reflection } from 'first-di'
import { HandleNode } from 'src/editor/handle/node'
import { YState } from 'src/editor/y-adapter/y-state'
import { MIXED_VALUE } from 'src/global/constant'
import { Service } from 'src/global/service'
import { createSlideSession } from 'src/utils/slide-session'
import {
  createDesignGeomInfo,
  designGeomFieldMap,
  designGeomFields,
  type DesignGeomField,
  type DesignGeomFieldContext,
  type DesignGeomFieldValue,
  type DesignGeomKey,
} from './field-definitions'

type DesignGeomDiff = Partial<Record<DesignGeomKey, DesignGeomFieldValue>>

const clearObject = (obj: Record<string, any>) => {
  objKeys(obj).forEach((key) => delete obj[key])
}

@reflection
export class DesignGeom extends Service {
  @observable currentGeom = createDesignGeomInfo()
  @observable.ref currentFields = <DesignGeomField[]>[]

  constructor(
    private readonly handleNode: HandleNode,
    private readonly yState: YState,
  ) {
    super()
    autoBind(makeObservable(this))
  }

  @action
  setupGeom(selectNodes: S.Node[]) {
    clearObject(this.currentGeom)
    const context = this.createFieldContext()

    this.currentFields = designGeomFields.filter((field) =>
      selectNodes.some(field.supports),
    )
    this.currentFields.forEach((field) => {
      let value: DesignGeomFieldValue | undefined = undefined
      for (const node of selectNodes) {
        if (!field.supports(node)) continue
        if (value === undefined) {
          value = field.read(node, context)
          continue
        }
        if (value !== field.read(node, context)) {
          this.currentGeom[field.key] = MIXED_VALUE
          return
        }
      }
      this.currentGeom[field.key] = value!
    })
  }

  setupSlideGeom(selectNodes: S.Node[], key: DesignGeomKey) {
    const field = designGeomFieldMap.get(key)
    if (field?.interaction !== 'number') return

    const context = this.createFieldContext()

    return createSlideSession({
      setup: () => {
        const origin = new Map<ID, number>()
        selectNodes.forEach((node) => {
          if (!field.supports(node)) return
          origin.set(node.id, field.read(node, context))
        })
        return origin
      },
      apply: (snapshot, delta) => {
        this.yState.transact(() => {
          selectNodes.forEach((node) => {
            if (!field.supports(node)) return
            const startValue = snapshot.get(node.id)!
            field.apply(node, startValue + delta, context)
          })
        })
      },
    })
  }

  @action
  setGeom(selectNodes: S.Node[], geom: DesignGeomDiff) {
    const context = this.createFieldContext()
    const changingKeys = objKeys(geom) as DesignGeomKey[]

    this.yState.transact(() => {
      selectNodes.forEach((node) => {
        this.applyChangeToNode(node, geom, changingKeys, context)
      })
    })
  }

  private createFieldContext(): DesignGeomFieldContext {
    return { handleNode: this.handleNode, yState: this.yState }
  }

  private applyChangeToNode(
    node: S.Node,
    geom: DesignGeomDiff,
    changingKeys: DesignGeomKey[],
    context: DesignGeomFieldContext,
  ) {
    changingKeys.forEach((key) => {
      const field = designGeomFieldMap.get(key)
      const value = geom[key] as never
      if (field?.supports(node) && value !== undefined) {
        field.apply(node, value, context)
      }
    })
  }
}
