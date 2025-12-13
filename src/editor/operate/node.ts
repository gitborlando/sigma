import { firstOne, reverseFor, stableIndex } from '@gitborlando/utils'
import autobind from 'class-autobind-decorator'
import { nanoid } from 'nanoid'
import { StageScene } from 'src/editor/render/scene'
import { clone } from 'src/shared/utils/normal'
import { SchemaUtil } from 'src/shared/utils/schema'
import { SchemaCreator } from '../schema/creator'
import { SchemaHistory } from '../schema/history'
import { Schema } from '../schema/schema'
import { ID, INode, INodeParent } from '../schema/type'

@autobind
class OperateNodeService {
  datumId = Signal.create('')
  datumXY = XY._(0, 0)
  selectIds = Signal.create(new Set<ID>())
  afterRemoveNodes = Signal.create<ID[]>()
  selectedNodes = Signal.create(<INode[]>[])
  intoEditNodeId = Signal.create('')
  selectedNodes$ = Signal.create(<INode[]>[])
  hoverId$ = Signal.create('')
  private lastSelectedNodeSet = new Set<INode>()
  private copyIds = <ID[]>[]
  initHook() {
    this.afterRemoveNodes.hook((ids) => {
      this.selectIds.dispatch((ids) => ids.clear())
    })
    Schema.onMatchPatch('/client/selectIds', () => {
      this.selectIds.dispatch(new Set(Schema.client.selectIds))
      this.selectedNodes$.dispatch(Schema.client.selectIds.map(Schema.find<INode>))
    })
    Schema.schemaChanged.hook(() => {
      const selectedNodes = Schema.client.selectIds.map(Schema.find<INode>)
      const selectionChange = () => {
        this.lastSelectedNodeSet = new Set(selectedNodes)
        this.selectedNodes.dispatch(selectedNodes)
      }
      if (this.lastSelectedNodeSet.size !== selectedNodes.length) {
        return selectionChange()
      }
      for (const node of selectedNodes) {
        if (!this.lastSelectedNodeSet.has(node)) return selectionChange()
      }
    })
    // this.intoEditNodeId.intercept((id) => {
    //   if (!id) return ''
    //   const node = Schema.find(id)
    //   if (node.type === 'irregular') return id
    //   return ''
    // })
  }
  get selectingNodes() {
    const nodes = <INode[]>[]
    this.selectIds.value.forEach((id) => nodes.push(Schema.find(id)))
    return nodes
  }
  select(id: ID) {
    YClients.select(id)
    // if (this.selectIds.value.has(id)) return
    // this.selectIds.dispatch((ids) => ids.add(id))
  }
  unSelect(id: ID) {
    YClients.unSelect(id)
    // if (!this.selectIds.value.has(id)) return
    // this.selectIds.dispatch((ids) => ids.delete(id))
  }
  clearSelect() {
    YClients.clearSelect()
    this.selectIds.dispatch(new Set())
  }
  commitSelect() {
    const selectIdArr = [...this.selectIds.value]
    this.autoGetDatumId(this.selectIds.value)
    // Schema.itemReset(Schema.client, ['selectIds'], selectIdArr)
    Schema.commitOperation(`选择节点`)
  }
  commitFinalSelect() {
    this.commitSelect()
    Schema.nextSchema()
    SchemaHistory.commit('选择节点')
  }
  addNodes(nodes: INode[]) {
    nodes.forEach(Schema.addItem)
    Schema.commitOperation('添加节点')
  }
  removeNodes(nodes: INode[]) {
    nodes.forEach(Schema.removeItem)
    Schema.commitOperation('移除节点')
    this.afterRemoveNodes.dispatch(nodes.map((node) => node.id))
  }
  insertAt(parent: INodeParent, node: INode, index?: number) {
    index ??= parent.childIds.length
    Schema.itemAdd(parent, ['childIds', index], node.id)
    Schema.itemReset(node, ['parentId'], parent.id)
    Schema.commitOperation('插入子节点')
  }
  splice(parent: INodeParent, node: INode) {
    const index = parent.childIds.indexOf(node.id)
    Schema.itemDelete(parent, ['childIds', index])
    Schema.itemReset(node, ['parentId'], '')
    Schema.commitOperation('移除子节点')
  }
  reHierarchy(parent: INodeParent, node: INode, index: number) {
    index = stableIndex(parent.childIds, index)
    const oldIndex = parent.childIds.indexOf(node.id)
    Schema.itemDelete(parent, ['childIds', oldIndex])
    Schema.itemAdd(parent, ['childIds', index], node.id)
    Schema.commitOperation('重新排序')
  }
  deleteSelectNodes() {
    const ids = [...this.selectIds.value]
    const nodes = <INode[]>[]
    this.clearSelect()
    this.commitSelect()
    const traverse = (id: ID, parent?: INodeParent) => {
      const node = Schema.find<INode>(id)
      if (!parent) parent = Schema.find<INodeParent>(node.parentId)
      nodes.push(node)
      this.splice(parent, node)
      if ('childIds' in node === false) return
      reverseFor(node.childIds, (id) => traverse(id, node))
      // node.childIds.forEach((id) => traverse(id, node))
    }
    ids.forEach((id) => traverse(id))
    this.removeNodes(nodes.reverse())
    Schema.finalOperation('删除节点')
  }
  copySelectNodes() {
    this.copyIds = [...this.selectIds.value]
  }
  pasteNodes() {
    if (!this.copyIds.length) return

    const newSelectIds = <ID[]>[]
    const cloneNodes = (oldNode: INode) => {
      const newNode = clone(oldNode)
      newNode.id = nanoid()
      newNode.name = SchemaCreator.createNodeName(oldNode.type).name
      if ('childIds' in newNode) newNode.childIds = []
      return newNode
    }
    SchemaUtil.traverseIds(this.copyIds, (props) => {
      const { node, parent, depth, upLevelRef } = props
      const newNode = cloneNodes(node)
      const newParent = upLevelRef?.newNode || parent
      this.addNodes([newNode])
      this.insertAt(newParent, newNode)
      props.newNode = newNode
      if (depth === 0) newSelectIds.push(newNode.id)
    })
    setTimeout(() => {
      this.selectIds.dispatch(new Set(newSelectIds))
      this.commitSelect()
      Schema.commitOperation('粘贴节点')
    }, 0)
  }
  paste() {
    this.pasteNodes()
    this.copyIds = []
    Schema.nextSchema()
    Schema.commitHistory('粘贴节点')
  }

  wrapInFrame() {
    const selectNodes = this.selectedNodes$.value
    if (selectNodes.length === 0) return

    const frameOBB = this.getSomeNodesMergedOBB(selectNodes)
    const frameNode = SchemaCreator.frame({
      width: frameOBB.width,
      height: frameOBB.height,
      x: frameOBB.x,
      y: frameOBB.y,
    })
    this.addNodes([frameNode])

    const oldParent = Schema.find<INodeParent>(selectNodes[0].parentId)
    selectNodes.forEach((node) => this.splice(oldParent, node))
    selectNodes.forEach((node) => this.insertAt(frameNode, node))
    this.insertAt(oldParent, frameNode)

    selectNodes.map((node) => this.unSelect(node.id))
    this.select(frameNode.id)
    this.commitFinalSelect()

    Schema.nextSchema()
    Schema.commitHistory('创建画板')
  }

  getSomeNodesMergedOBB(nodes: INode[]) {
    const aabbList = nodes.map((node) => StageScene.findElem(node.id).aabb)
    return OBB.fromAABB(AABB.merge(aabbList))
  }

  getNodeCenterXY(node: INode) {
    const center = XY._(node.x + node.width / 2, node.y + node.height / 2)
    return XY.of(center).rotate(XY._(node.x, node.y), node.rotation).xy
  }

  private autoGetDatumId(selectIds: Set<string>) {
    if (selectIds.size === 0) {
      this.datumId.dispatch('')
    }
    if (selectIds.size === 1) {
      this.datumId.dispatch(Schema.find<INode>(firstOne(selectIds)).parentId)
    }
    if (selectIds.size > 1) {
      const parentIds = new Set<string>()
      selectIds.forEach((id) => parentIds.add(Schema.find<INode>(id).parentId))
      if (parentIds.size === 1) this.datumId.dispatch(firstOne(parentIds))
      if (parentIds.size > 1) this.datumId.dispatch('')
    }
    const elem = StageScene.findElem(this.datumId.value)
    if (!elem) return (this.datumXY = XY._(0, 0))
    this.datumXY = XY._(elem.obb.aabb.minX, elem.obb.aabb.minY)
  }
}

export const OperateNode = new OperateNodeService()

let selectIdList = <string[]>[]
let selectedNodes = <INode[]>[]

export function getSelectIds() {
  return selectIdList
}

export function getSelectNodes() {
  return selectedNodes
}

OperateNode.selectIds.hook({ beforeAll: true }, (selectIds) => {
  selectIdList = [...selectIds]
  selectedNodes = selectIdList.map(Schema.find<INode>)
})
