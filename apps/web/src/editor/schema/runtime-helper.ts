import { SchemaHelper, type SchemaTraverseCallback } from 'src/editor/schema/helper'
import { getSelectPageId } from 'src/editor/utils/get'

export class SchemaRuntimeHelper {
  static isById(id: ID, type: S.SchemaItem['type'] | 'nodeParent'): boolean {
    if (type === 'nodeParent')
      return ['page', 'frame', 'group'].includes(YState.find(id).type)
    return YState.find(id).type === type
  }

  static isFirstLayerFrame(id: ID) {
    const node = YState.find(id)
    return node.type === 'frame' && SchemaHelper.isPageById(node.parentId)
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

  static createCurrentPageTraverse({
    callback,
    bubbleCallback,
  }: {
    callback?: SchemaTraverseCallback
    bubbleCallback?: SchemaTraverseCallback
  }) {
    const curPage = YState.find<S.Page>(getSelectPageId())
    const traverse = this.createTraverse({ callback, bubbleCallback })
    return () => traverse(curPage.childIds)
  }

  static createTraverse({
    callback,
    bubbleCallback,
    getNode = YState.find<S.Node>,
  }: {
    callback?: SchemaTraverseCallback
    bubbleCallback?: SchemaTraverseCallback
    getNode?: (id: ID) => S.Node
  }) {
    return SchemaHelper.createTraverse({ callback, bubbleCallback, getNode })
  }
}
