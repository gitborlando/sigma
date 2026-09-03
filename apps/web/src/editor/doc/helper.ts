import { AnyObject, clone, getSet, miniId } from '@gitborlando/utils'
import { findGraph, findNode, findParent } from 'src/editor/doc/finder'
import { Matrix, MRect } from 'src/editor/geometry'
import { mergeOverrideArray } from 'src/shared/export'

export class DocHelper {
  private static mrectCache = new Map<ID, MRect>()

  private static isGraph(item: AnyObject): item is S.Graph {
    return typeof item === 'object' && item !== null && 'type' in item
  }

  static isPage(item: AnyObject): item is S.Page {
    return this.isGraph(item) && item.type === 'page'
  }

  static isPageById(id: ID): boolean {
    const item = findGraph(id)
    return this.isPage(item)
  }

  static isNode(item: AnyObject): item is S.Node
  static isNode(
    item: AnyObject,
    variant: S.Node['variant'],
  ): item is Extract<S.Node, { variant: typeof variant }>
  static isNode(item: AnyObject, variant?: S.Node['variant']): item is S.Node {
    if (!this.isGraph(item))
      throw new Error(`DocHelper.isNode error: invalid item ${item}`)
    if (!variant) return item.type === 'node'
    return 'variant' in item && item.variant === variant
  }

  static isParent<T extends S.Parent>(item: AnyObject): item is T {
    return this.isGraph(item) && 'childIds' in item
  }

  static isRootFrame(id: ID): boolean {
    const node = findGraph(id)
    return (
      this.isNode(node, 'frame') && !!node.parentId && this.isPageById(node.parentId)
    )
  }

  static clone<T extends S.Graph>(item: T, option?: Partial<T>): T {
    const newItem = clone(item)
    newItem.id = item.type === 'page' ? `page_${miniId(8)}` : miniId(8)
    if ('childIds' in newItem) newItem.childIds = []
    return mergeOverrideArray(newItem, option || {}) as T
  }

  static getMRect(node: S.Node) {
    const compare = [node.width, node.height, node.matrix, node.aspectRatio]
    return getSet(this.mrectCache, node.id, () => MRect.of(node), compare)
  }

  static getChildren(parent: S.Parent) {
    return parent.childIds.map((id) => findNode(id))
  }

  static findAncestor(id: ID | S.Node, utilFunc?: (node: S.Node) => boolean) {
    let node = typeof id === 'string' ? findNode(id) : id
    utilFunc ||= (node: S.Node) => DocHelper.isPageById(node.parentId)
    while (node.parentId) {
      if (utilFunc(node)) return node
      node = findNode(node.parentId)
    }
    return node
  }

  static getAncestorMatrix(node: S.Node) {
    let found: S.Graph = node
    const matrix = Matrix.identity()
    while (found.parentId) {
      found = findParent(found.parentId)
      if (found.matrix) matrix.prepend(found.matrix)
    }
    return matrix
  }

  static getRootMatrix(node: S.Node) {
    return Matrix.of(node.matrix).prepend(this.getAncestorMatrix(node))
  }
}
