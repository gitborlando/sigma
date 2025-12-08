import { Schema } from 'src/editor/schema/schema'
import { getSelectPageId } from 'src/editor/y-state/y-clients'

export type SchemaUtilTraverseData = {
  id: ID
  node: V1.Node
  index: number
  depth: number
  childIds?: string[]
  parent: V1.NodeParent
  ancestors: string[]
  abort: AbortController
  forwardRef?: SchemaUtilTraverseData
  [key: string & {}]: any
}

type ITraverseCallback = (arg: SchemaUtilTraverseData) => any

export class SchemaHelper {
  static isPageById(id: ID) {
    return id.startsWith('page_')
  }

  static is<T extends V1.SchemaItem>(
    item: V1.SchemaItem,
    type: V1.SchemaItem['type'],
  ): item is T {
    return item.type === type
  }

  static isById(id: ID, type: V1.SchemaItem['type'] | 'nodeParent'): boolean {
    if (type === 'nodeParent')
      return ['page', 'frame', 'group'].includes(Schema.find(id).type)
    return Schema.find(id).type === type
  }

  static isNodeParent<T extends { childIds: string[] }>(node: any): node is T {
    return 'childIds' in node
  }

  static isFirstLayerFrame(id: ID) {
    const node = YState.find(id)
    return node.type === 'frame' && this.isPageById(node.parentId)
  }

  static getChildren(id: ID | V1.NodeParent) {
    const childIds =
      (typeof id !== 'string' ? id : Schema.find<V1.NodeParent>(id))?.childIds || []
    return childIds.map((id) => Schema.find<V1.Node>(id))
  }

  static findAncestor(id: ID | V1.Node, utilFunc?: (node: V1.Node) => boolean) {
    let node = typeof id === 'string' ? Schema.find<V1.Node>(id) : id
    utilFunc ||= (node: V1.Node) => SchemaHelper.isPageById(node.parentId)
    while (node.parentId) {
      if (utilFunc(node)) return node
      node = Schema.find<V1.Node>(node.parentId)
    }
    return node
  }

  static findParent(node: V1.Node) {
    while (node.parentId) {
      if (SchemaHelper.is<V1.Frame>(node, 'frame')) return node
      node = Schema.find<V1.Node>(node.parentId)
    }
    return node
  }

  static getForwardAccumulatedMatrix(node: V1.Node) {
    const matrix = Matrix.identity()
    while (node.parentId) {
      node = YState.find<V1.Node>(node.parentId)
      if (node.matrix) matrix.prepend(node.matrix)
    }
    return matrix.plain()
  }

  static getSceneMatrix(node: V1.Node) {
    const matrix = Matrix.of(node.matrix)
    while (node.parentId) {
      const parent = YState.find<V1.Node>(node.parentId)
      if (parent.matrix) {
        matrix.prepend(Matrix.of(parent.matrix))
      }
      node = parent
    }
    return matrix.plain()
  }

  static createCurrentPageTraverse({
    callback,
    bubbleCallback,
  }: {
    callback?: ITraverseCallback
    bubbleCallback?: ITraverseCallback
  }) {
    const curPage = YState.find<V1.Page>(getSelectPageId())
    const traverse = this.createTraverse({ callback, bubbleCallback })
    return () => traverse(curPage.childIds)
  }

  static createTraverse({
    callback,
    bubbleCallback,
  }: {
    callback?: ITraverseCallback
    bubbleCallback?: ITraverseCallback
  }) {
    const abort = new AbortController()
    const traverse = (
      ids: string[],
      depth: number,
      forwardRef?: SchemaUtilTraverseData,
    ) => {
      ids.forEach((id, index) => {
        if (abort.signal.aborted) return

        const node = YState.find<V1.Node>(id)
        if (node === undefined) return

        const childIds = 'childIds' in node ? node.childIds : undefined
        const parent = T<V1.NodeParent>(
          forwardRef?.node || YState.find<V1.NodeParent>(node.parentId),
        )
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
}
