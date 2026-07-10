import { max } from 'src/editor/geometry/base'
import { HandleNode } from 'src/editor/handle/node'
import { YState } from 'src/editor/y-adapter/y-state'
import { MIXED_VALUE } from 'src/global/constant'

export const designOBBKeys = ['x', 'y', 'width', 'height', 'rotation'] as const
export const designGeomKeys = [
  ...designOBBKeys,
  'aspectRatio',
  'radius',
  'startAngle',
  'endAngle',
  'innerRate',
] as const

export type DesignOBBKey = (typeof designOBBKeys)[number]
export type DesignGeomKey = (typeof designGeomKeys)[number]
export type DesignGeomFieldValue = number | boolean | (string & {})
export type DesignGeomInfo = Record<
  DesignGeomKey,
  DesignGeomFieldValue | typeof MIXED_VALUE
>

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

export type DesignNumberField = DesignGeomFieldBase<number> & {
  interaction: 'number'
}

export type DesignToggleField = DesignGeomFieldBase<boolean> & {
  interaction: 'toggle'
}

export type DesignSelectField<Value extends string = string> =
  DesignGeomFieldBase<Value> & {
    interaction: 'select'
    getOptions: (
      nodes: S.Node[],
      context: DesignGeomFieldContext,
    ) => readonly Value[]
  }

export type DesignGeomField =
  | DesignNumberField
  | DesignToggleField
  | DesignSelectField

export const createDesignGeomInfo = () =>
  ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rotation: 0,
    radius: 0,
    startAngle: 0,
    endAngle: 360,
    innerRate: 0,
    flip: 0,
    aspectRatio: false,
  }) as unknown as DesignGeomInfo

const designOBBKeySet = new Set<DesignGeomKey>(designOBBKeys)

export const isDesignOBBKey = (key: DesignGeomKey): key is DesignOBBKey =>
  designOBBKeySet.has(key)

const createMRectField = (key: DesignOBBKey): DesignNumberField => ({
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
    if (mrect.aspectRatio > 0) {
      const linkedKey = key === 'width' ? 'height' : 'width'
      yState.set<S.Node>([node.id, linkedKey], mrect[linkedKey])
    }
  },
})

const aspectRatioField: DesignToggleField = {
  key: 'aspectRatio',
  interaction: 'toggle',
  supports: () => true,
  read: (node, { handleNode }) => handleNode.getMRect(node).aspectRatio > 0,
  apply: (node, value, { handleNode, yState }) => {
    const mrect = handleNode.getMRect(node)
    mrect.lockAspectRatio(value)
    yState.set<S.Node>([node.id, 'aspectRatio'], mrect.aspectRatio)
  },
}

const createNumberField = (
  key: Exclude<DesignGeomKey, DesignOBBKey>,
  supports: (node: S.Node) => boolean,
  normalize = (value: number) => value,
): DesignNumberField => ({
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

export const designGeomFields: DesignGeomField[] = [
  ...designOBBKeys.map(createMRectField),
  aspectRatioField,
  createNumberField('radius', supportRadius, (value) => max(0, value)),
  createNumberField('startAngle', supportEllipse),
  createNumberField('endAngle', supportEllipse),
  createNumberField('innerRate', supportEllipse),
]

export const designGeomFieldMap = new Map(
  designGeomFields.map((field) => [field.key, field]),
)
