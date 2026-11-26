import { Service } from '@gitborlando/di-service'
import { clone, getSet, miniId } from '@gitborlando/utils'
import { Matrix, MRect } from 'src/editor/geometry'
import { mergeOverrideArray } from 'src/shared/export'
import { DocFinder } from './finder'
import { DocGuards } from './guards'

@reflection
export class DocHelper extends Service {
  constructor(private readonly finder: DocFinder) {
    super()
  }

  static isPage = DocGuards.isPage.bind(DocGuards)
  static isNode = DocGuards.isNode.bind(DocGuards) as typeof DocGuards.isNode
  static isParent = DocGuards.isParent.bind(DocGuards) as typeof DocGuards.isParent

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

  private static mrectCache = new Map<ID, MRect>()

  isPageById(id: ID): boolean {
    const item = this.finder.findGraph(id)
    return DocHelper.isPage(item)
  }

  isRootFrame(id: ID): boolean {
    const node = this.finder.findGraph(id)
    return (
      DocHelper.isNode(node, 'frame') &&
      !!node.parentId &&
      this.isPageById(node.parentId)
    )
  }

  getChildren(parent: S.Parent) {
    return parent.childIds.map((id) => this.finder.findNode(id))
  }

  findAncestor(id: ID | S.Node, utilFunc?: (node: S.Node) => boolean) {
    let node = typeof id === 'string' ? this.finder.findNode(id) : id
    utilFunc ||= (node: S.Node) => this.isPageById(node.parentId)
    while (node.parentId) {
      if (utilFunc(node)) return node
      node = this.finder.findNode(node.parentId)
    }
    return node
  }

  getAncestorMatrix(node: S.Node) {
    let found: S.Graph = node
    const matrix = Matrix.identity()
    while (found.parentId) {
      found = this.finder.findParent(found.parentId)
      if (found.matrix) matrix.prepend(found.matrix)
    }
    return matrix
  }

  getRootMatrix(node: S.Node) {
    return Matrix.of(node.matrix).prepend(this.getAncestorMatrix(node))
  }
}
