import { clampIndex, firstOne, getSet } from '@gitborlando/utils'
import { reflection } from 'first-di'
import { makeObservable } from 'mobx'
import { MRect } from 'src/editor/geometry'
import { HandleSelect } from 'src/editor/handle/select'
import { SchemaHelper } from 'src/editor/schema/helper'
import { Service } from 'src/global/service'
import { YState } from '../y-adapter/y-state'

@reflection
export class HandleNode extends Service {
  @computed get datumXY() {
    return this.getDatumXY()
  }

  private mrectCache = new Map<ID, MRect>()

  constructor(
    private readonly yState: YState,
    private readonly handleSelect: HandleSelect,
  ) {
    super()
    autoBind(makeObservable(this))
  }

  getMRect(node: S.Node) {
    const compare = [node.width, node.height, node.matrix]
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

  getNodesMergedOBB(nodes: S.Node[]) {
    const aabbList = nodes.map((node) => OBB.fromRect(node, node.rotation).aabb)
    return OBB.fromAABB(AABB.merge(aabbList))
  }

  getNodeCenterXY(node: S.Node) {
    return OBB.fromRect(node, node.rotation).center
  }

  private getDatumXY() {
    const selectIds = this.handleSelect.selectIdList
    let datumId = ''

    if (selectIds.length === 1) {
      datumId = this.yState.find<S.Node>(firstOne(selectIds)!).parentId
    }
    if (selectIds.length > 1) {
      const parentIds = new Set<string>()
      selectIds.forEach((id) => parentIds.add(this.yState.find<S.Node>(id).parentId))
      if (parentIds.size === 1) datumId = firstOne(parentIds)!
      if (parentIds.size > 1) datumId = ''
    }

    const datum = this.yState.find<S.Node>(datumId)
    if (datum && !SchemaHelper.isPageById(datum.id)) {
      const aabb = OBB.fromRect(datum, datum.rotation).aabb
      return XY.$(aabb.minX, aabb.minY)
    } else {
      return XY.$(0, 0)
    }
  }
}
