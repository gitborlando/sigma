import { max } from 'src/editor/geometry/base'
import { HandleNode } from 'src/editor/handle/node'
import { YState } from 'src/editor/y-adapter/y-state'

export const designOBBKeys = ['x', 'y', 'width', 'height', 'rotation'] as const

export type DesignOBBKey = (typeof designOBBKeys)[number]
export type DesignGeomInfo = ReturnType<typeof createDesignGeomInfo>
export type DesignGeomKey = keyof DesignGeomInfo
export type DesignGeomFieldValue = number | boolean | string

export type DesignGeomFieldContext = {
  handleNode: HandleNode
  yState: YState
}

type DesignGeomFieldBase<Value extends DesignGeomFieldValue> = {
  key: DesignGeomKey
  supports: (node: S.Node) => boolean
  read: (node: S.Node, context: DesignGeomFieldContext) => Value
  apply: (node: S.Node, value: Value, context: DesignGeomFieldContext) => void
}

export type DesignNumberFieldDefinition = DesignGeomFieldBase<number> & {
  interaction: 'number'
}

export type DesignToggleFieldDefinition = DesignGeomFieldBase<boolean> & {
  interaction: 'toggle'
}

export type DesignSelectFieldDefinition<Value extends string = string> =
  DesignGeomFieldBase<Value> & {
    interaction: 'select'
    getOptions: (
      nodes: S.Node[],
      context: DesignGeomFieldContext,
    ) => readonly Value[]
  }

export type DesignGeomFieldDefinition =
  | DesignNumberFieldDefinition
  | DesignToggleFieldDefinition
  | DesignSelectFieldDefinition

export const createDesignGeomInfo = () => ({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  rotation: 0,
  radius: 0,
  startAngle: 0,
  endAngle: 360,
  innerRate: 0,
})

const designOBBKeySet = new Set<DesignGeomKey>(designOBBKeys)

export const isDesignOBBKey = (key: DesignGeomKey): key is DesignOBBKey =>
  designOBBKeySet.has(key)

const createMRectFieldDefinition = (
  key: DesignOBBKey,
): DesignNumberFieldDefinition => ({
  key,
  interaction: 'number',
  supports: () => true,
  read: (node, { handleNode }) => handleNode.getMRect(node)[key],
  apply: (node, value, { handleNode, yState }) => {
    if (key === 'height' && node.type === 'line') return

    const mrect = handleNode.getMRect(node)
    mrect[key] = value

    if (key === 'x' || key === 'y' || key === 'rotation') {
      yState.set<S.Node>([node.id, 'matrix'], mrect.matrix)
      return
    }

    yState.set<S.Node>([node.id, key], mrect[key])
  },
})

const createNodePropFieldDefinition = (
  key: Exclude<DesignGeomKey, DesignOBBKey>,
  supports: (node: S.Node) => boolean,
  normalize = (value: number) => value,
): DesignNumberFieldDefinition => ({
  key,
  interaction: 'number',
  supports,
  read: (node) => T<any>(node)[key],
  apply: (node, value, context) => {
    context.yState.set<any>([node.id, key], normalize(value))
  },
})

const supportRadius = (node: S.Node) => node.type === 'frame' || node.type === 'rect'

const supportEllipse = (node: S.Node) => node.type === 'ellipse'

export const designGeomFieldDefinitions: DesignGeomFieldDefinition[] = [
  ...designOBBKeys.map(createMRectFieldDefinition),
  createNodePropFieldDefinition('radius', supportRadius, (value) => max(0, value)),
  createNodePropFieldDefinition('startAngle', supportEllipse),
  createNodePropFieldDefinition('endAngle', supportEllipse),
  createNodePropFieldDefinition('innerRate', supportEllipse),
]
