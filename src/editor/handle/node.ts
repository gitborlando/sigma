import { createCache, firstOne, iife, stableIndex } from '@gitborlando/utils'
import { MRect } from 'src/editor/math'
import { SchemaHelper } from 'src/editor/schema/helper'
import { getSelectIdList } from 'src/editor/y-state/y-clients'
import { SchemaCreator } from '../schema/creator'
import { Schema } from '../schema/schema'

class HandleNodeService {
  datumId = ''
  @observable.ref datumXY = XY.$(0, 0)
  copiedIds = <ID[]>[]

  private mrectCache = createCache<ID, MRect>()

  getMRect(node: V1.Node) {
    return this.mrectCache.getSet(node.id, () => MRect.of(node), [
      node.width,
      node.height,
      node.matrix,
    ])
  }

  subscribe() {
    return Disposer.collect(YClients.afterSelect.hook(() => this.getDatum()))
  }

  addNodes(nodes: V1.Node[]) {
    nodes.forEach((node) => YState.set(`${node.id}`, node))
  }

  removeNodes(nodes: V1.Node[]) {
    nodes.forEach((node) => YState.delete(`${node.id}`))
  }

  insertChildAt(parent: V1.NodeParent, node: V1.Node, index?: number) {
    index ??= parent.childIds.length
    YState.insert(`${parent.id}.childIds.${index}`, node.id)
    YState.set(`${node.id}.parentId`, parent.id)
  }

  removeChild(parent: V1.NodeParent, node: V1.Node) {
    const index = parent.childIds.indexOf(node.id)
    YState.delete(`${parent.id}.childIds.${index}`)
    YState.set(`${node.id}.parentId`, '')
  }

  deleteChild(parent: V1.NodeParent, node: V1.Node) {
    const index = parent.childIds.indexOf(node.id)
    YState.delete(`${parent.id}.childIds.${index}`)
    YState.delete(`${node.id}`)
  }

  reHierarchy(parent: V1.NodeParent, node: V1.Node, index: number) {
    index = stableIndex(parent.childIds, index)
    const oldIndex = parent.childIds.indexOf(node.id)
    YState.delete(`${parent.id}.childIds.${oldIndex}`)
    YState.insert(`${parent.id}.childIds.${index}`, node.id)
  }

  getNodesMergedOBB(nodes: V1.Node[]) {
    const aabbList = nodes.map((node) => OBB.fromRect(node, node.rotation).aabb)
    return OBB.fromAABB(AABB.merge(aabbList))
  }

  getNodeCenterXY(node: V1.Node) {
    return OBB.fromRect(node, node.rotation).center
  }

  deleteSelectedNodes() {
    const traverse = SchemaHelper.createTraverse({
      bubbleCallback: ({ node, parent }) => this.deleteChild(parent, node),
    })
    traverse(getSelectIdList())

    YClients.clearSelect()
    YClients.afterSelect.dispatch()

    YState.next()
    YUndo.track({
      type: 'all',
      description: sentence(t('verb.delete'), t('noun.node')),
    })
  }

  copySelectedNodes() {
    this.copiedIds = getSelectIdList()
  }

  pasteNodes() {
    if (!this.copiedIds.length) return

    const newSelectIds = <ID[]>[]
    const traverse = SchemaHelper.createTraverse({
      callback: (props) => {
        const { node, parent, forwardRef: upLevelRef, depth } = props
        const newParent = upLevelRef?.newNode || parent
        const newNode = SchemaCreator.clone(node)
        newNode.name = SchemaCreator.createNodeName(node.type)
        this.addNodes([newNode])
        this.insertChildAt(newParent, newNode)
        props.newNode = newNode
        if (depth === 0) newSelectIds.push(newNode.id)
      },
    })
    traverse(this.copiedIds)
    this.copiedIds = []

    YState.next()
    YUndo.untrack(() => newSelectIds.forEach((id) => YClients.select(id)))
    YUndo.track({
      type: 'all',
      description: sentence(
        t('verb.paste'),
        t('noun.node'),
        ': ',
        newSelectIds.length.toString(),
      ),
    })
  }

  reHierarchySelectedNode(type: 'up' | 'down' | 'top' | 'bottom') {
    const selected = getSelectIdList().map(YState.find<V1.Node>)

    selected.forEach((node) => {
      const parent = YState.find<V1.NodeParent>(node.parentId)
      let index = parent.childIds.indexOf(node.id)
      index = iife(() => {
        if (type === 'up') return index - 1
        if (type === 'down') return index + 1
        if (type === 'top') return 0
        return parent.childIds.length - 1
      })
      this.reHierarchy(parent, node, index)
    })

    YState.next()
    YUndo.track({
      type: 'all',
      description: sentence(t('verb.reorder'), t('noun.node')),
    })
  }

  wrapInFrame() {
    const selected = getSelectIdList().map(YState.find<V1.Node>)
    if (selected.length === 0) return

    const frameOBB = this.getNodesMergedOBB(selected)
    const frameNode = SchemaCreator.frame({ ...frameOBB })
    const oldParent = YState.find<V1.NodeParent>(selected[0].parentId)
    const index = oldParent.childIds.indexOf(selected[0].id)

    this.addNodes([frameNode])
    this.insertChildAt(oldParent, frameNode, index)
    selected.forEach((node) => this.removeChild(oldParent, node))
    selected.forEach((node) => this.insertChildAt(frameNode, node))

    YState.next()
    YUndo.untrack(
      action(() => {
        selected.forEach((node) => YClients.unSelect(node.id))
        YClients.select(frameNode.id)
      }),
    )
    YUndo.track({
      type: 'all',
      description: sentence(t('verb.create'), t('noun.frame')),
    })
  }

  private getDatum() {
    const selectIds = getSelectIdList()

    if (selectIds.length === 0) {
      this.datumId = ''
    }
    if (selectIds.length === 1) {
      this.datumId = Schema.find<V1.Node>(firstOne(selectIds)!).parentId
    }
    if (selectIds.length > 1) {
      const parentIds = new Set<string>()
      selectIds.forEach((id) => parentIds.add(Schema.find<V1.Node>(id).parentId))
      if (parentIds.size === 1) this.datumId = firstOne(parentIds)!
      if (parentIds.size > 1) this.datumId = ''
    }

    const datum = YState.find<V1.Node>(this.datumId)
    if (datum && !SchemaHelper.isPageById(datum.id)) {
      const aabb = OBB.fromRect(datum, datum.rotation).aabb
      this.datumXY = XY.$(aabb.minX, aabb.minY)
    } else {
      this.datumXY = XY.$(0, 0)
    }
  }
}

export const HandleNode = autoBind(makeObservable(new HandleNodeService()))
