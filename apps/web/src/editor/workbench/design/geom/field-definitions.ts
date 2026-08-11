import { clamp } from 'es-toolkit'
import { DocHelper } from 'src/editor/doc/helper'
import { DocMutator } from 'src/editor/doc/mutator'
import { max } from 'src/editor/geometry/base'
import { YDoc } from 'src/editor/y-adapter/y-doc'
import { GRAPHS, MIXED_VALUE } from 'src/global/constant'

export const designOBBKeys = ['x', 'y', 'width', 'height', 'rotation'] as const
export const designGeomKeys = [
  ...designOBBKeys,
  'flip',
  'aspectRatio',
  'radius',
  'startAngle',
  'sweepAngle',
  'innerRate',
] as const

export type DesignOBBKey = (typeof designOBBKeys)[number]
export type DesignGeomKey = (typeof designGeomKeys)[number]
export type DesignGeomFieldValue = number | boolean | (string & {})
export type DesignGeomInfo = Record<
  DesignGeomKey,
  DesignGeomFieldValue | typeof MIXED_VALUE
>

export type DesignGeomFieldContext = { docMutator: DocMutator; yDoc: YDoc }

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
    sweepAngle: 360,
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
  read: (node) => DocHelper.getMRect(node)[key],
  apply: (node, value, { docMutator, yDoc }) => {
    if (key === 'height' && node.variant === 'line') return

    const mrect = DocHelper.getMRect(node)
    mrect[key] = value

    if (key === 'x' || key === 'y' || key === 'rotation') {
      yDoc.set<S.Node>([GRAPHS, node.id, 'matrix'], mrect.matrix)
      return
    }

    docMutator.setNodeSize(node, mrect.width, mrect.height)
  },
})

const aspectRatioField: DesignToggleField = {
  key: 'aspectRatio',
  interaction: 'toggle',
  supports: () => true,
  read: (node) => DocHelper.getMRect(node).aspectRatio > 0,
  apply: (node, value, { yDoc }) => {
    const mrect = DocHelper.getMRect(node)
    mrect.lockAspectRatio(value)
    yDoc.set<S.Node>([GRAPHS, node.id, 'aspectRatio'], mrect.aspectRatio)
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
    context.yDoc.set<any>([GRAPHS, node.id, key], normalize(value))
  },
})

const supportRadius = (node: S.Node) =>
  node.variant === 'frame' || node.variant === 'rect'
const supportEllipse = (node: S.Node) => node.variant === 'ellipse'

export const designGeomFields: DesignGeomField[] = [
  aspectRatioField,
  ...designOBBKeys.map(createMRectField),
  createNumberField('flip', () => true),
  createNumberField('radius', supportRadius, (v) => max(0, v)),
  createNumberField('startAngle', supportEllipse, (v) => Angle.normal(v)),
  createNumberField('sweepAngle', supportEllipse, (v) => Angle.normal(v)),
  createNumberField('innerRate', supportEllipse, (v) => clamp(v, 0, 1)),
]

export const designGeomFieldMap = new Map(
  designGeomFields.map((field) => [field.key, field]),
)
