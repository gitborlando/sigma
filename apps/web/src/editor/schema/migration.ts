import { clone } from '@gitborlando/utils'
import { omit } from 'es-toolkit'
import { SchemaHelper, SchemaTraverseContext } from 'src/editor/schema/helper'

type Migration = {
  version: number
  desc: string
  transform: (ctx: SchemaTraverseContext) => void
}

export function migrationSchema(schema: any) {
  const version = schema?.meta?.version

  const newSchema = clone(schema) as S.Schema
  const migrations = migrationList.slice(version)

  const traverse = SchemaHelper.createTraverse2({
    schema: newSchema,
    enter: (ctx) => migrations.forEach((m) => m.transform(ctx)),
  })
  traverse(newSchema.meta.pageIds)

  newSchema.meta.version = migrationList.length
  console.log('newSchema: ', newSchema)
  return newSchema
}

const migrationList = [
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
      ])
      if (!nodeTypes.has(node.type)) return

      const { x, y, rotation, width, height } = T<S1.Node>(node)

      const mrect = MRect.identity(width, height)
      const parentXY = SchemaHelper.isNode(parent) ? parent : XY.$(0, 0)
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

      const { x, y, rotation, width, height } = T<S1.Node>(node)

      const parentXY = SchemaHelper.isNode(parent) ? parent : XY.$(0, 0)
      const mrect = MRect.identity(width, height)
      mrect.shift(XY.from(x, y).minus(parentXY))
      mrect.rotate(rotation)

      Object.assign(node, { ...mrect.plain(), __isNode: true })
    },
  },
  // {
  //   version: 2,
  //   desc: '对所有节点: 使用8位短id代替长id',
  //   func: (props: SchemaUtilTraverseData, schema: S.Schema) => {
  //     const { node, parent, index } = props
  //     node.id = miniId(8)
  //     node.parentId = parent.id
  //     parent.childIds[index] = node.id
  //     schema[node.id] = node
  //     delete schema[props.id]
  //   },
  // },
  {
    version: 2,
    desc: '去除hFlip, vFlip属性, 改为flip: "x" | "y" | "xy" | undefined',
    transform: (ctx: SchemaTraverseContext) => {
      const { item: node, schema } = ctx
      if (!SchemaHelper.isNode(node)) return

      const hFlip = T<any>(node).hFlip
      const vFlip = T<any>(node).vFlip

      node.flip = 0
      if (hFlip && vFlip) node.flip = 3
      else if (hFlip) node.flip = 1
      else if (vFlip) node.flip = 2

      const newNode = omit(node, ['hFlip', 'vFlip'])
      schema[node.id] = newNode as S.SchemaItem
    },
  },
] satisfies Migration[]
