import { isNil } from 'es-toolkit'

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

  static isById(id: ID, type: S.SchemaItem['type'] | 'nodeParent'): boolean {
    if (type === 'nodeParent')
      return ['page', 'frame', 'group'].includes(YState.find(id).type)
    return YState.find(id).type === type
  }

  static isNodeParent<T extends { childIds: string[] }>(node: any): node is T {
    return 'childIds' in node
  }

  static isFirstLayerFrame(id: ID) {
    const node = YState.find(id)
    return node.type === 'frame' && this.isPageById(node.parentId)
  }

  static getChildren(id: ID | S.NodeParent) {
    const childIds =
      (typeof id !== 'string' ? id : YState.find<S.NodeParent>(id))?.childIds || []
    return childIds.map((id) => YState.find<S.Node>(id))
  }

  static findAncestor(id: ID | S.Node, utilFunc?: (node: S.Node) => boolean) {
    let node = typeof id === 'string' ? YState.find<S.Node>(id) : id
    utilFunc ||= (node: S.Node) => SchemaHelper.isPageById(node.parentId)
    while (node.parentId) {
      if (utilFunc(node)) return node
      node = YState.find<S.Node>(node.parentId)
    }
    return node
  }

  static findParent(node: S.Node) {
    while (node.parentId) {
      if (SchemaHelper.is<S.Frame>(node, 'frame')) return node
      node = YState.find<S.Node>(node.parentId)
    }
    return node
  }

  static getForwardAccumulatedMatrix(node: S.Node) {
    const matrix = Matrix.identity()
    while (node.parentId) {
      node = YState.find<S.Node>(node.parentId)
      if (node.matrix) matrix.prepend(node.matrix)
    }
    return matrix.plain()
  }

  static getSceneMatrix(node: S.Node) {
    const matrix = Matrix.of(node.matrix)
    while (node.parentId) {
      const parent = YState.find<S.Node>(node.parentId)
      if (parent.matrix) {
        matrix.prepend(Matrix.of(parent.matrix))
      }
      node = parent
    }
    return matrix.plain()
  }

  static getPageChildIds(pageId: ID) {
    return YState.find<S.Page>(pageId).childIds
  }
}
