import { XY } from '@gitborlando/geo'
import { clone } from '@gitborlando/utils'
import { clamp, omit } from 'es-toolkit'
import { MRect } from 'src/editor/geometry'
import { createRegularPolygon, createStarPolygon } from 'src/editor/geometry/point'
import { SchemaHelper } from 'src/editor/schema/helper'
import {
  createSchemaTraverse,
  type SchemaTraverseContext,
} from 'src/editor/schema/traverse'
import { T } from 'src/utils/common'

type Migration = {
  version: number
  desc: string
  transform: (ctx: SchemaTraverseContext) => void
}

type LegacyObbNode = {
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

export function migrationSchema(schema: any) {
  const version = schema?.meta?.version

  const newSchema = clone(schema) as S.Schema
  const migrations = migrationList.slice(version)

  const traverse = createSchemaTraverse({
    getSchema: () => newSchema,
    enter: (ctx) => migrations.forEach((m) => m.transform(ctx)),
  })
  traverse(newSchema.meta.pageIds)

  newSchema.meta.version = migrationList.length
  return newSchema
}

export function getLatestVersion() {
  return migrationList.length
}

export const migrationList = [
  {
    version: 0,
    desc: '对frame, group, rectangle, ellipse, text, line, polygon, star, path节点:新增 matrix 属性; 添加 __isNode 属性, 标记为节点类型',
    transform: (ctx: SchemaTraverseContext) => {
      const { item: node, parent } = ctx
      const nodeTypes = new Set([
        'frame',
        'group',
        'rectangle',
        'ellipse',
        'text',
        'line',
        'polygon',
        'star',
        'path',
        'irregular',
      ])
      if (!nodeTypes.has(node.type)) return

      const { x, y, rotation, width, height } = T<LegacyObbNode>(node)

      const mrect = MRect.identity(width, height)
      const parentXY = SchemaHelper.isNode(parent)
        ? (parent as unknown as LegacyObbNode)
        : XY.$(0, 0)

      mrect.shift(XY.from(x, y).minus(parentXY))
      mrect.rotate(rotation)

      Object.assign(node, { ...mrect.plain(), __isNode: true })
    },
  },
  {
    version: 1,
    desc: '对rect节点:新增 matrix 属性; 添加 __isNode 属性, 标记为节点类型',
    transform: (ctx: SchemaTraverseContext) => {
      const { item: node, parent } = ctx
      if (node.type !== 'rect') return

      const { x, y, rotation, width, height } = T<LegacyObbNode>(node)

      const mrect = MRect.identity(width, height)
      const parentXY = SchemaHelper.isNode(parent)
        ? (parent as unknown as LegacyObbNode)
        : XY.$(0, 0)

      mrect.shift(XY.from(x, y).minus(parentXY))
      mrect.rotate(rotation)

      Object.assign(node, { ...mrect.plain(), __isNode: true })
    },
  },
  {
    version: 2,
    desc: `去除hFlip, vFlip属性或flip: 'x'|'y'|'xy', 改为flip: 0|1|2|3`,
    transform: (ctx: SchemaTraverseContext) => {
      const { item: node, schema } = ctx
      if (!SchemaHelper.isNode(node)) return

      const old = node as any
      const hFlip = old.hFlip || old.flip === 'x'
      const vFlip = old.vFlip || old.flip === 'y'
      const bothFlip = (hFlip && vFlip) || old.flip === 'xy'

      node.flip = 0
      if (bothFlip) node.flip = 3
      else if (hFlip) node.flip = 1
      else if (vFlip) node.flip = 2

      const newNode = omit(old, ['hFlip', 'vFlip'])
      schema[node.id] = newNode as S.SchemaItem
    },
  },
  {
    version: 3,
    desc: `更改 Path 类图形的 type: 'irregular' -> 'path'`,
    transform: (ctx: SchemaTraverseContext) => {
      type LegacyPathNode = { type: 'irregular' }
      const node = T<LegacyPathNode>(ctx.item)

      if (node.type === 'irregular') {
        Object.assign(node, { type: 'path' })
      }
    },
  },
  {
    version: 4,
    desc: `将 polygon / star 节点迁移为 path 节点`,
    transform: (ctx: SchemaTraverseContext) => {
      type LegacyShapeNode = S.NodeBase & {
        type: 'polygon' | 'star'
        points?: S.Point[]
        sides?: number
        pointCount?: number
        radius?: number
        innerRate?: number
      }

      const node = T<LegacyShapeNode>(ctx.item)
      if (node.type !== 'polygon' && node.type !== 'star') return

      const legacyType = node.type
      const points =
        Array.isArray(node.points) && node.points.length > 0
          ? node.points
          : legacyType === 'polygon'
            ? createRegularPolygon(node.width, node.height, node.sides ?? 3)
            : createStarPolygon(
                node.width,
                node.height,
                node.pointCount ?? 5,
                node.innerRate ?? 0.382,
              )

      points[0].isStart ||= true
      points[points.length - 1].isEnd ||= true

      Object.assign(node, { type: 'path', points })
      delete node.radius

      if (legacyType === 'polygon') {
        delete node.sides
        return
      }

      delete node.pointCount
      delete node.innerRate
    },
  },
  {
    version: 5,
    desc: `将 ellipse 的 endAngle 改为 sweepAngle`,
    transform: (ctx: SchemaTraverseContext) => {
      type LegacyEllipseNode = S.NodeBase & {
        type: 'ellipse'
        startAngle: number
        endAngle?: number
        sweepAngle?: number
      }

      const node = T<LegacyEllipseNode>(ctx.item)
      if (node.type !== 'ellipse') return

      node.sweepAngle ??= clamp(node.endAngle! - node.startAngle, -360, 360)
      delete node.endAngle
    },
  },
  {
    version: 6,
    desc: `移除旧的 x, y, rotation 三个属性`,
    transform: (ctx: SchemaTraverseContext) => {
      type LegacyXYRNode = S.Node & { x?: number; y?: number; rotation?: number }

      const node = T<LegacyXYRNode>(ctx.item)
      if (!SchemaHelper.isNode(node)) return

      const legacyNode = node as LegacyXYRNode
      delete legacyNode.x
      delete legacyNode.y
      delete legacyNode.rotation
    },
  },
  {
    version: 7,
    desc: `为描边新增 style、dash、gap 属性`,
    transform: ({ item }) => {
      if (!SchemaHelper.isNode(item)) return

      item.stroke.style ??= 'solid'
      item.stroke.dash ??= 2
      item.stroke.gap ??= 2
    },
  },
] satisfies Migration[]
