import { clampIndex } from '@gitborlando/utils'
import { makeObservable } from 'mobx'
import { findParent } from 'src/editor/doc/finder'
import { IMatrix } from 'src/editor/geometry'
import { GRAPHS } from 'src/global/constant'
import { Service } from 'src/global/service'
import { YDoc } from '../y-adapter/y-doc'

@reflection
export class DocMutator extends Service {
  constructor(private readonly yDoc: YDoc) {
    super()
    autoBind(makeObservable(this))
  }

  addNodes(nodes: S.Node[]) {
    nodes.forEach((node) => this.yDoc.set<S.Node>([GRAPHS, node.id], node))
  }

  removeNodes(nodes: S.Node[]) {
    nodes.forEach((node) => this.yDoc.delete<S.Node>([GRAPHS, node.id]))
  }

  insertChildAt(parent: S.Parent, node: S.Node, index?: number) {
    index ??= parent.childIds.length
    this.yDoc.insert<S.Parent>([GRAPHS, parent.id, 'childIds', index], node.id)
    this.yDoc.set<S.Node>([GRAPHS, node.id, 'parentId'], parent.id)
  }

  removeChild(parentId: ID, nodeId: ID) {
    const parent = findParent(parentId)
    const index = parent.childIds.indexOf(nodeId)
    this.yDoc.delete<S.Parent>([GRAPHS, parent.id, 'childIds', index])
    this.yDoc.set<S.Node>([GRAPHS, nodeId, 'parentId'], '')
  }

  deleteChild(parent: S.Parent, node: S.Node) {
    const index = parent.childIds.indexOf(node.id)
    this.yDoc.delete<S.Parent>([GRAPHS, parent.id, 'childIds', index])
    this.yDoc.delete<S.Node>([GRAPHS, node.id])
  }

  reHierarchy(parent: S.Parent, node: S.Node, index: number) {
    index = clampIndex(parent.childIds, index)
    const oldIndex = parent.childIds.indexOf(node.id)
    this.yDoc.delete<S.Parent>([GRAPHS, parent.id, 'childIds', oldIndex])
    this.yDoc.insert<S.Parent>([GRAPHS, parent.id, 'childIds', index], node.id)
  }

  setNodeSize(node: S.Node, width: number, height: number) {
    if (node.width === width && node.height === height) return

    if (node.variant === 'path' || node.variant === 'line') {
      const scaleX = node.width === 0 ? 1 : width / node.width
      const scaleY = node.height === 0 ? 1 : height / node.height
      const scaleXY = ({ x, y }: IXY) => ({ x: x * scaleX, y: y * scaleY })
      const points = node.points.map((point) => ({
        ...point,
        ...scaleXY(point),
        ...(point.in && { in: scaleXY(point.in) }),
        ...(point.out && { out: scaleXY(point.out) }),
      }))
      this.yDoc.set<S.Node>([GRAPHS, node.id, 'points'], points)
    }

    this.yDoc.set<S.Node>([GRAPHS, node.id, 'width'], width)
    this.yDoc.set<S.Node>([GRAPHS, node.id, 'height'], height)
  }

  setMatrix(nodeOrPage: S.Node | S.Page, matrix: IMatrix) {
    this.yDoc.set<S.Node | S.Page>([GRAPHS, nodeOrPage.id, 'matrix'], matrix)
  }
}
