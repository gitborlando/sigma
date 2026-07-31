import { clone, getSet, miniId } from '@gitborlando/utils'
import { isNil } from 'es-toolkit'
import { Matrix, MRect } from 'src/editor/geometry'
import { mergeOverrideArray } from 'src/utils/export'

type SchemaFinder = <T extends S.SchemaItem>(id: string) => T
type SpecificSchemaItem<T extends S.SchemaItem['type']> = Extract<
  S.SchemaItem,
  { type: T }
>

const missingFinder: SchemaFinder = () => {
  throw new Error('SchemaHelper.find is not configured')
}

export class SchemaHelper {
  private static find: SchemaFinder = missingFinder
  private static mrectCache = new Map<ID, MRect>()

  static setup(option: { find: SchemaFinder }) {
    this.find = option.find
  }

  static isPageById(id: ID) {
    return id.startsWith('page_')
  }

  static isById(id: ID, type: S.SchemaItem['type'] | 'nodeParent'): boolean {
    if (type === 'nodeParent')
      return ['page', 'frame', 'group'].includes(this.find(id).type)
    return this.find(id).type === type
  }

  static is<T extends S.SchemaItem['type']>(
    item: S.SchemaItem,
    type: T,
  ): item is SpecificSchemaItem<T>
  static is(item: S.SchemaItem, type: S.SchemaItem['type']) {
    return item.type === type
  }

  static isNode(item?: S.SchemaItem): item is S.Node {
    return !isNil(item) && '__isNode' in item && item.__isNode
  }

  static isNodeParent<T extends S.NodeParent>(node: S.SchemaItem): node is T {
    return 'childIds' in node
  }

  static isRootFrame(id: ID) {
    const node = this.find(id)
    return node.type === 'frame' && this.isPageById(node.parentId)
  }

  static clone<T extends S.SchemaItem>(item: T, option?: Partial<T>) {
    const newItem = clone(item)
    newItem.id = item.type === 'page' ? `page_${miniId(8)}` : miniId(8)
    if ('childIds' in newItem) newItem.childIds = []
    return mergeOverrideArray(newItem, option || {}) as T
  }

  static getMRect(node: S.Node) {
    const compare = [node.width, node.height, node.matrix, node.aspectRatio]
    return getSet(this.mrectCache, node.id, () => MRect.of(node), compare)
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
      if (SchemaHelper.is(node, 'frame')) return node
      node = this.find<S.Node>(node.parentId)
    }
    return node
  }

  static getAncestorMatrix(node: S.Node) {
    const matrix = Matrix.identity()
    while (node.parentId) {
      node = this.find<S.Node>(node.parentId)
      if (node.matrix) matrix.prepend(node.matrix)
    }
    return matrix.plain()
  }

  static getRootMatrix(node: S.Node) {
    return Matrix.of(node.matrix).prepend(this.getAncestorMatrix(node))
  }

  static getPageChildIds(pageId: ID) {
    return this.find<S.Page>(pageId).childIds
  }
}
