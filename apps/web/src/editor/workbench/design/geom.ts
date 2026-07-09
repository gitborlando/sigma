import { objKeys } from '@gitborlando/utils'
import { reflection } from 'first-di'
import { HandleNode } from 'src/editor/handle/node'
import { YState } from 'src/editor/y-adapter/y-state'
import { MULTI_VALUE } from 'src/global/constant'
import { Service } from 'src/global/service'
import {
  createDesignGeomInfo,
  designGeomFieldDefinitions,
  type DesignGeomFieldContext,
  type DesignGeomFieldDefinition,
  type DesignGeomFieldValue,
  type DesignGeomKey,
} from './geom-field-definitions'

export type {
  DesignGeomFieldValue,
  DesignGeomInfo,
  DesignGeomKey,
  DesignOBBKey,
} from './geom-field-definitions'

export type DesignGeomKeys = DesignGeomKey

const geomFieldDefinitionMap = new Map(
  designGeomFieldDefinitions.map((definition) => [definition.key, definition]),
)

type DesignGeomChange = Partial<Record<DesignGeomKey, DesignGeomFieldValue>>
type DesignNumberGeomChange = Partial<Record<DesignGeomKey, number>>

const clearObject = (obj: Record<string, any>) => {
  objKeys(obj).forEach((key) => delete obj[key])
}

@reflection
export class DesignGeom extends Service {
  @observable currentGeom = createDesignGeomInfo()
  @observable.ref currentFields = <DesignGeomFieldDefinition[]>[]
  @observable.ref currentKeys = new Set<DesignGeomKey>()

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
    this.currentFields = designGeomFieldDefinitions.filter((definition) =>
      selectNodes.some(definition.supports),
    )
    this.currentKeys = new Set(
      this.currentFields.map((definition) => definition.key),
    )

    const context = this.createFieldContext()
    this.currentFields.forEach((definition) => {
      const values = selectNodes
        .filter(definition.supports)
        .map((node) => definition.read(node, context))

      const [firstValue] = values
      if (firstValue === undefined) return

      T<any>(this.currentGeom)[definition.key] = firstValue
      if (values.some((value) => value !== firstValue))
        T<any>(this.currentGeom)[definition.key] = MULTI_VALUE
    })
  }

  getGeomValue(
    node: S.Node,
    key: DesignGeomKey,
    context = this.createFieldContext(),
  ) {
    return geomFieldDefinitionMap.get(key)?.read(node, context) ?? 0
  }

  private nodeGeomCache = new Map<ID, Partial<Record<DesignGeomKey, number>>>()

  startSetGeom(selectedNodes: S.Node[]) {
    this.nodeGeomCache.clear()
    const context = this.createFieldContext()
    selectedNodes.forEach((node) => {
      const latestNode = this.yState.find<S.Node>(node.id)
      const geom: Partial<Record<DesignGeomKey, number>> = {}
      this.currentFields.forEach((definition) => {
        if (definition.interaction === 'number' && definition.supports(latestNode))
          geom[definition.key] = definition.read(latestNode, context)
      })
      this.nodeGeomCache.set(node.id, geom)
    })
  }

  @action
  setGeom(selectNodes: S.Node[], geom: DesignGeomChange) {
    const context = this.createFieldContext()
    const changingKeys = objKeys(geom) as DesignGeomKey[]

    this.yState.transact(() => {
      selectNodes.forEach((node) => {
        const latestNode = this.yState.find<S.Node>(node.id)
        this.applyChangeToNode(latestNode, geom, changingKeys, context)
      })
    })

    this.setupGeom(this.findLatestNodes(selectNodes))
  }

  @action
  slideGeom(selectNodes: S.Node[], deltaGeom: DesignNumberGeomChange) {
    const context = this.createFieldContext()
    const changingKeys = objKeys(deltaGeom) as DesignGeomKey[]

    this.yState.transact(() => {
      selectNodes.forEach((node) => {
        const latestNode = this.yState.find<S.Node>(node.id)
        const geom = this.getSlideGeom(latestNode, deltaGeom, changingKeys, context)
        this.applyChangeToNode(latestNode, geom, changingKeys, context)
      })
    })

    this.setupGeom(this.findLatestNodes(selectNodes))
  }

  endSetGeom() {
    this.nodeGeomCache.clear()
  }

  private createFieldContext(): DesignGeomFieldContext {
    return {
      handleNode: this.handleNode,
      yState: this.yState,
    }
  }

  private getSlideGeom(
    node: S.Node,
    deltaGeom: DesignNumberGeomChange,
    changingKeys: DesignGeomKey[],
    context: DesignGeomFieldContext,
  ) {
    const geom: DesignNumberGeomChange = {}
    const startGeom = this.nodeGeomCache.get(node.id)

    changingKeys.forEach((key) => {
      const definition = geomFieldDefinitionMap.get(key)
      const delta = deltaGeom[key]
      if (
        definition?.interaction !== 'number' ||
        !definition.supports(node) ||
        delta === undefined
      )
        return

      const startValue = startGeom?.[key] ?? definition.read(node, context)
      geom[key] = startValue + delta
    })

    return geom
  }

  private applyChangeToNode(
    node: S.Node,
    geom: DesignGeomChange,
    changingKeys: DesignGeomKey[],
    context: DesignGeomFieldContext,
  ) {
    changingKeys.forEach((key) => {
      const definition = geomFieldDefinitionMap.get(key)
      const value = geom[key]
      if (!definition?.supports(node) || value === undefined) return
      this.applyFieldDefinition(node, definition, value, context)
    })
  }

  private applyFieldDefinition(
    node: S.Node,
    definition: DesignGeomFieldDefinition,
    value: DesignGeomFieldValue,
    context: DesignGeomFieldContext,
  ) {
    if (definition.interaction === 'number') {
      if (typeof value !== 'number') return
      definition.apply(node, value, context)
      return
    }

    if (definition.interaction === 'toggle') {
      if (typeof value !== 'boolean') return
      definition.apply(node, value, context)
      return
    }

    if (typeof value !== 'string') return
    definition.apply(node, value, context)
  }

  private findLatestNodes(nodes: S.Node[]) {
    return nodes.map((node) => this.yState.find<S.Node>(node.id))
  }
}
