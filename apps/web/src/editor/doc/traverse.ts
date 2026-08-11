import { type AnyObject } from '@gitborlando/utils'
import { findParent } from 'src/editor/doc/finder'
import { docGetter } from 'src/editor/doc/getter'
import { T } from 'src/utils/common'

export type GraphTraverseOptions<ExtendCtx extends AnyObject = {}> = {
  getDoc?: () => S.Doc
  enter?: (ctx: GraphTraverseContext<ExtendCtx>) => boolean | void
  leave?: (ctx: GraphTraverseContext<ExtendCtx>) => void
}

export type GraphTraverseContext<ExtendCtx extends AnyObject = {}> = {
  schema: S.Doc
  graph: S.Graph
  depth: number
  index: number
  ancestors: S.Parent[]
  stopped: boolean
  stopPropagation: () => void
  childIds?: string[]
  parent?: S.Parent
  forwardCtx?: GraphTraverseContext<ExtendCtx>
} & ExtendCtx

export function createGraphTraverse<ExtendCtx extends AnyObject = {}>(
  options: GraphTraverseOptions<ExtendCtx>,
) {
  const { enter, leave } = options

  const traverse = (
    parent: S.Parent | undefined,
    childIds: string[],
    depth: number,
    forwardCtx?: GraphTraverseContext<ExtendCtx>,
  ) => {
    let stopped = false
    const stopPropagation = () => (stopped = true)

    childIds.forEach((id, index) => {
      if (stopped) return

      const getSchema = options.getDoc ?? docGetter
      if (!getSchema) {
        throw new Error(
          'createSchemaTraverse: getSchema should be configured or injected',
        )
      }

      const schema = getSchema()
      const graph = schema.graphs[id]
      if (!graph) return

      const childIds = 'childIds' in graph ? graph.childIds : undefined
      const ctxParent =
        parent || (graph.parentId ? findParent(graph.parentId) : undefined)
      const ancestors = forwardCtx ? [...forwardCtx.ancestors] : []
      if (parent) ancestors.push(parent)

      const ctx: GraphTraverseContext<ExtendCtx> = {
        ...({} as ExtendCtx),
        schema,
        graph,
        index,
        depth,
        childIds,
        forwardCtx,
        parent: ctxParent,
        ancestors,
        stopped,
        stopPropagation,
      }

      let isContinue = enter?.(ctx) ?? true

      if (isContinue && childIds) {
        traverse(T<S.Parent>(graph), childIds, depth + 1, ctx)
      }

      leave?.(ctx)
    })
  }

  return (ids: string[]) => traverse(undefined, ids, 0)
}
