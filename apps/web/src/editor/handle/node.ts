import { clampIndex, getSet } from '@gitborlando/utils'
import { makeObservable } from 'mobx'
import { MRect } from 'src/editor/geometry'
import { Service } from 'src/global/service'
import { YState } from '../y-adapter/y-state'

@reflection
export class HandleNode extends Service {
  private mrectCache = new Map<ID, MRect>()

  constructor(private readonly yState: YState) {
    super()
    autoBind(makeObservable(this))
  }

  getMRect(node: S.Node) {
    const compare = [node.width, node.height, node.matrix, node.aspectRatio]
    return getSet(this.mrectCache, node.id, () => MRect.of(node), compare)
  }

  addNodes(nodes: S.Node[]) {
    nodes.forEach((node) => this.yState.set<S.Node>([node.id], node))
  }

  removeNodes(nodes: S.Node[]) {
    nodes.forEach((node) => this.yState.delete<S.Node>([node.id]))
  }

  insertChildAt(parent: S.NodeParent, node: S.Node, index?: number) {
    index ??= parent.childIds.length
    this.yState.insert<S.NodeParent>([parent.id, 'childIds', index], node.id)
    this.yState.set<S.Node>([node.id, 'parentId'], parent.id)
  }

  removeChild(parent: S.NodeParent, node: S.Node) {
    const index = parent.childIds.indexOf(node.id)
    this.yState.delete<S.NodeParent>([parent.id, 'childIds', index])
    this.yState.set<S.Node>([node.id, 'parentId'], '')
  }

  deleteChild(parent: S.NodeParent, node: S.Node) {
    const index = parent.childIds.indexOf(node.id)
    this.yState.delete<S.NodeParent>([parent.id, 'childIds', index])
    this.yState.delete<S.Node>([node.id])
  }

  reHierarchy(parent: S.NodeParent, node: S.Node, index: number) {
    index = clampIndex(parent.childIds, index)
    const oldIndex = parent.childIds.indexOf(node.id)
    this.yState.delete<S.NodeParent>([parent.id, 'childIds', oldIndex])
    this.yState.insert<S.NodeParent>([parent.id, 'childIds', index], node.id)
  }

  setNodeSize(node: S.Node, width: number, height: number) {
    if (node.width === width && node.height === height) return

    if (node.type === 'path' || node.type === 'line') {
      const scaleX = node.width === 0 ? 1 : width / node.width
      const scaleY = node.height === 0 ? 1 : height / node.height
      const scaleXY = ({ x, y }: IXY) => ({ x: x * scaleX, y: y * scaleY })
      const points = node.points.map((point) => ({
        ...point,
        ...scaleXY(point),
        ...(point.in && { in: scaleXY(point.in) }),
        ...(point.out && { out: scaleXY(point.out) }),
      }))
      this.yState.set<S.Node>([node.id, 'points'], points)
    }

    this.yState.set<S.Node>([node.id, 'width'], width)
    this.yState.set<S.Node>([node.id, 'height'], height)
  }
}
