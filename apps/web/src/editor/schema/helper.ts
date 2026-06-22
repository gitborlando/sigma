import { isNil } from 'es-toolkit'
import { Matrix } from 'src/editor/math'

type SchemaFinder = <T extends S.SchemaItem>(id: string) => T

const missingFinder: SchemaFinder = () => {
  throw new Error('SchemaHelper.find is not configured')
}

export class SchemaHelper {
  private static find: SchemaFinder = missingFinder

  static init(option: { find: SchemaFinder }) {
    this.find = option.find
  }

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
      return ['page', 'frame', 'group'].includes(this.find(id).type)
    return this.find(id).type === type
  }

  static isNodeParent<T extends S.NodeParent>(node: S.SchemaItem): node is T {
    return 'childIds' in node
  }

  static isFirstLayerFrame(id: ID) {
    const node = this.find(id)
    return node.type === 'frame' && this.isPageById(node.parentId)
  }

  static getChildren(id: ID | S.NodeParent) {
    const childIds =
      (typeof id !== 'string' ? id : this.find<S.NodeParent>(id))?.childIds || []
    return childIds.map((id) => this.find<S.Node>(id))
  }

  static findAncestor(id: ID | S.Node, utilFunc?: (node: S.Node) => boolean) {
    let node = typeof id === 'string' ? this.find<S.Node>(id) : id
    utilFunc ||= (node: S.Node) => SchemaHelper.isPageById(node.parentId)
    while (node.parentId) {
      if (utilFunc(node)) return node
      node = this.find<S.Node>(node.parentId)
    }
    return node
  }

  static findParent(node: S.Node) {
    while (node.parentId) {
      if (SchemaHelper.is<S.Frame>(node, 'frame')) return node
      node = this.find<S.Node>(node.parentId)
    }
    return node
  }

  static getForwardAccumulatedMatrix(node: S.Node) {
    const matrix = Matrix.identity()
    while (node.parentId) {
      node = this.find<S.Node>(node.parentId)
      if (node.matrix) matrix.prepend(node.matrix)
    }
    return matrix.plain()
  }

  static getSceneMatrix(node: S.Node) {
    const matrix = Matrix.of(node.matrix)
    while (node.parentId) {
      const parent = this.find<S.Node>(node.parentId)
      if (parent.matrix) {
        matrix.prepend(Matrix.of(parent.matrix))
      }
      node = parent
    }
    return matrix.plain()
  }

  static getPageChildIds(pageId: ID) {
    return this.find<S.Page>(pageId).childIds
  }
}
