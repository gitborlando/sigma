import type { AnyObject } from '@gitborlando/utils'
import { T } from 'src/utils/common'

export type SchemaTraverseOptions<ExtendCtx extends AnyObject = {}> = {
  schema: S.Schema
  enter?: (ctx: SchemaTraverseContext<ExtendCtx>) => boolean | void
  leave?: (ctx: SchemaTraverseContext<ExtendCtx>) => void
}

export type SchemaTraverseContext<ExtendCtx extends AnyObject = {}> = {
  schema: S.Schema
  item: S.SchemaItem
  depth: number
  index: number
  stopped: boolean
  stopPropagation: () => void
  ancestors: S.NodeParent[]
  childIds?: string[]
  parent?: S.NodeParent
  forwardCtx?: SchemaTraverseContext<ExtendCtx>
} & ExtendCtx

export function createSchemaTraverse<ExtendCtx extends AnyObject = {}>(
  options: SchemaTraverseOptions<ExtendCtx>,
) {
  const { schema, enter, leave } = options

  const traverse = (
    parent: S.NodeParent | undefined,
    ids: string[],
    depth: number,
    forwardCtx?: SchemaTraverseContext<ExtendCtx>,
  ) => {
    let stopped = false
    const stopPropagation = () => (stopped = true)

    ids.forEach((id, index) => {
      if (stopped) return

      const item = schema[id]
      if (!item) return

      const childIds = 'childIds' in item ? item.childIds : undefined
      const parentId = 'parentId' in item ? T<S.Node>(item).parentId : undefined
      const ctxParent =
        parent || (parentId ? T<S.NodeParent>(schema[parentId]) : undefined)
      const ancestors = forwardCtx ? [...forwardCtx.ancestors] : []
      if (parent) ancestors.push(parent)

      const ctx: SchemaTraverseContext<ExtendCtx> = {
        ...({} as ExtendCtx),
        schema,
        item,
        index,
        depth,
        forwardCtx,
        parent: ctxParent,
        ancestors,
        stopped,
        stopPropagation,
      }

      let isContinue = enter?.(ctx) ?? true

      if (isContinue && childIds) {
        traverse(T<S.NodeParent>(item), childIds, depth + 1, ctx)
      }

      leave?.(ctx)
    })
  }

  return (ids: string[]) => traverse(undefined, ids, 0)
}
