import { type AnyObject } from '@gitborlando/utils'
import { DocGuards } from './guards'
import { T } from 'src/shared/common'

export type GraphTraverseOptions<ExtendCtx extends AnyObject = {}> = {
  getDoc: () => S.Doc
  enter?: (ctx: GraphTraverseContext<ExtendCtx>) => boolean | void
  leave?: (ctx: GraphTraverseContext<ExtendCtx>) => void
}

export type GraphTraverseContext<ExtendCtx extends AnyObject = {}> = {
  doc: S.Doc
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

      const doc = options.getDoc()
      const graph = doc.graphs[id]
      if (!graph) return

      const childIds = 'childIds' in graph ? graph.childIds : undefined
      let ctxParent = parent
      if (!ctxParent && graph.parentId) {
        const candidate = doc.graphs[graph.parentId]
        if (!candidate) throw new Error(`Item not found: ${graph.parentId}`)
        if (!DocGuards.isParent(candidate))
          throw new Error(`Parent not found: ${graph.parentId}`)
        ctxParent = candidate
      }
      const ancestors = forwardCtx ? [...forwardCtx.ancestors] : []
      if (parent) ancestors.push(parent)

      const ctx: GraphTraverseContext<ExtendCtx> = {
        ...({} as ExtendCtx),
        doc,
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
