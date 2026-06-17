import { AnyObject } from '@gitborlando/utils'
import { isNil } from 'es-toolkit'

export type SchemaUtilTraverseData = {
  id: ID
  node: S.Node
  index: number
  depth: number
  childIds?: string[]
  parent: S.NodeParent
  ancestors: string[]
  abort: AbortController
  forwardRef?: SchemaUtilTraverseData
  [key: string & {}]: any
}

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

export type SchemaTraverseCallback = (arg: SchemaUtilTraverseData) => any

export class SchemaHelper {
  static isPageById(id: ID) {
    return id.startsWith('page_')
  }

  static is<T extends S.SchemaItem>(
    item: S.SchemaItem,
    type: S.SchemaItem['type'],
  ): item is T {
    return item.type === type
  }

  static isNode(item?: S.SchemaItem): item is S.Node {
    return !isNil(item) && '__isNode' in item && item.__isNode
  }

  static isNodeParent<T extends { childIds: string[] }>(node: any): node is T {
    return 'childIds' in node
  }

  static createTraverse({
    callback,
    bubbleCallback,
    getNode,
  }: {
    callback?: SchemaTraverseCallback
    bubbleCallback?: SchemaTraverseCallback
    getNode: (id: ID) => S.Node
  }) {
    const abort = new AbortController()
    const traverse = (
      ids: string[],
      depth: number,
      forwardRef?: SchemaUtilTraverseData,
    ) => {
      ids.forEach((id, index) => {
        if (abort.signal.aborted) return

        const node = getNode(id)
        if (node === undefined) return

        const childIds = 'childIds' in node ? node.childIds : undefined
        const parent = T<S.NodeParent>(forwardRef?.node || getNode(node.parentId))
        const ancestors = forwardRef ? [...forwardRef.ancestors, forwardRef.id] : []
        const props = {
          id,
          node,
          index,
          childIds,
          depth,
          abort,
          forwardRef,
          parent,
          ancestors,
        }
        const isContinue = callback?.(props)
        if (isContinue !== false && childIds) traverse(childIds, depth + 1, props)
        bubbleCallback?.(props)
      })
    }
    return (ids: string[]) => traverse(ids, 0)
  }

  static createTraverse2<ExtendCtx extends AnyObject = {}>(
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
        const ancestors = forwardCtx ? [...forwardCtx.ancestors] : []
        if (parent) ancestors.push(parent)

        const ctx: SchemaTraverseContext<ExtendCtx> = {
          ...({} as ExtendCtx),
          schema,
          item,
          index,
          depth,
          forwardCtx,
          parent,
          ancestors,
          stopped,
          stopPropagation,
        }

        let isContinue = true
        isContinue = enter?.(ctx) ?? true

        if (isContinue && childIds) {
          traverse(T<S.NodeParent>(item), childIds, depth + 1, ctx)
        }

        leave?.(ctx)
      })
    }

    return (ids: string[]) => traverse(undefined, ids, 0)
  }
}
