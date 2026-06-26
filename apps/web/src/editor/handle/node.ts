import { Disposer } from '@gitborlando/toolkit/disposer'
import { clampIndex, firstOne, getSet, iife } from '@gitborlando/utils'
import { EditorService } from 'src/editor'
import { MRect } from 'src/editor/geometry'
import { SchemaHelper } from 'src/editor/schema/helper'
import { createSchemaTraverse } from 'src/editor/schema/traverse'
import { getSelectedNodes, getSelectIdList } from '../utils/get'

export class HandleNodeService extends EditorService {
  datumId = ''
  @observable.ref datumXY = XY.$(0, 0)
  copiedIds = <ID[]>[]

  private mrectCache = new Map<ID, MRect>()

  getMRect(node: S.Node) {
    return getSet(this.mrectCache, node.id, () => MRect.of(node), [
      node.width,
      node.height,
      node.matrix,
    ])
  }

  subscribe() {
    return Disposer.combine(
      this.editor.handleSelect.afterSelect.hook(() => this.getDatum()),
    )
  }

  addNodes(nodes: S.Node[]) {
    nodes.forEach((node) => this.editor.yState.set<S.Node>([node.id], node))
  }

  removeNodes(nodes: S.Node[]) {
    nodes.forEach((node) => this.editor.yState.delete<S.Node>([node.id]))
  }

  insertChildAt(parent: S.NodeParent, node: S.Node, index?: number) {
    index ??= parent.childIds.length
    this.editor.yState.insert<S.NodeParent>([parent.id, 'childIds', index], node.id)
    this.editor.yState.set<S.Node>([node.id, 'parentId'], parent.id)
  }

  removeChild(parent: S.NodeParent, node: S.Node) {
    const index = parent.childIds.indexOf(node.id)
    this.editor.yState.delete<S.NodeParent>([parent.id, 'childIds', index])
    this.editor.yState.set<S.Node>([node.id, 'parentId'], '')
  }

  deleteChild(parent: S.NodeParent, node: S.Node) {
    const index = parent.childIds.indexOf(node.id)
    this.editor.yState.delete<S.NodeParent>([parent.id, 'childIds', index])
    this.editor.yState.delete<S.Node>([node.id])
  }

  reHierarchy(parent: S.NodeParent, node: S.Node, index: number) {
    index = clampIndex(parent.childIds, index)
    const oldIndex = parent.childIds.indexOf(node.id)
    this.editor.yState.delete<S.NodeParent>([parent.id, 'childIds', oldIndex])
    this.editor.yState.insert<S.NodeParent>([parent.id, 'childIds', index], node.id)
  }

  getNodesMergedOBB(nodes: S.Node[]) {
    const aabbList = nodes.map((node) => OBB.fromRect(node, node.rotation).aabb)
    return OBB.fromAABB(AABB.merge(aabbList))
  }

  getNodeCenterXY(node: S.Node) {
    return OBB.fromRect(node, node.rotation).center
  }

  deleteSelectedNodes() {
    this.editor.yState.transact(() => {
      const traverse = createSchemaTraverse({
        schema: this.editor.yState.schema,
        leave: ({ item, parent }) => {
          if (!parent || !SchemaHelper.isNode(item)) return
          this.deleteChild(parent, item)
        },
      })
      traverse(getSelectIdList(this.editor))

      this.editor.handleSelect.clearSelect()
    })
    this.editor.undo.track('all', t('delete nodes'))
  }

  copySelectedNodes() {
    this.copiedIds = getSelectIdList(this.editor)
  }

  pasteNodes() {
    if (!this.copiedIds.length) return

    const newSelectIds = <ID[]>[]
    this.editor.yState.transact(() => {
      const traverse = createSchemaTraverse<{ newNode?: S.Node | S.NodeParent }>({
        schema: this.editor.yState.schema,
        enter: (ctx) => {
          const { item, parent, forwardCtx, depth } = ctx
          if (!parent || !SchemaHelper.isNode(item)) return false

          const newParent = forwardCtx?.newNode || parent
          const newNode = this.editor.schemaCreator.clone(item, {
            name: this.editor.schemaCreator.createNodeName(item.type),
          })
          this.addNodes([newNode])
          this.insertChildAt(newParent as S.NodeParent, newNode)
          ctx.newNode = newNode
          if (depth === 0) newSelectIds.push(newNode.id)
        },
      })
      traverse(this.copiedIds)
      this.copiedIds = []
    })
    this.editor.undo.untrack(() => {
      this.editor.handleSelect.clearSelect()
      newSelectIds.forEach((id) => this.editor.handleSelect.select(id))
    })
    this.editor.undo.track('all', `${t('paste nodes')}: ${newSelectIds.length}`)
  }

  reHierarchySelectedNode(type: 'up' | 'down' | 'top' | 'bottom') {
    const selected = getSelectedNodes(this.editor)

    this.editor.yState.transact(() => {
      selected.forEach((node) => {
        const parent = this.editor.find<S.NodeParent>(node.parentId)
        let index = parent.childIds.indexOf(node.id)
        index = iife(() => {
          if (type === 'up') return index - 1
          if (type === 'down') return index + 1
          if (type === 'top') return 0
          return parent.childIds.length - 1
        })
        this.reHierarchy(parent, node, index)
      })
    })

    this.editor.undo.track('all', t('reorder nodes'))
  }

  wrapInFrame() {
    const selected = getSelectIdList(this.editor).map((id) =>
      this.editor.find<S.Node>(id),
    )
    if (selected.length === 0) return

    const frameOBB = this.getNodesMergedOBB(selected)
    const frameNode = this.editor.schemaCreator.frame({ ...frameOBB })
    const oldParent = this.editor.find<S.NodeParent>(selected[0].parentId)
    const index = oldParent.childIds.indexOf(selected[0].id)

    this.editor.yState.transact(() => {
      this.addNodes([frameNode])
      this.insertChildAt(oldParent, frameNode, index)
      selected.forEach((node) => this.removeChild(oldParent, node))
      selected.forEach((node) => this.insertChildAt(frameNode, node))
    })
    this.editor.undo.untrack(
      action(() => {
        selected.forEach((node) => this.editor.handleSelect.unselect(node.id))
        this.editor.handleSelect.select(frameNode.id)
      }),
    )
    this.editor.undo.track('all', t('create frame'))
  }

  private getDatum() {
    const selectIds = getSelectIdList(this.editor)

    if (selectIds.length === 0) {
      this.datumId = ''
    }
    if (selectIds.length === 1) {
      this.datumId = this.editor.find<S.Node>(firstOne(selectIds)!).parentId
    }
    if (selectIds.length > 1) {
      const parentIds = new Set<string>()
      selectIds.forEach((id) => parentIds.add(this.editor.find<S.Node>(id).parentId))
      if (parentIds.size === 1) this.datumId = firstOne(parentIds)!
      if (parentIds.size > 1) this.datumId = ''
    }

    const datum = this.editor.find<S.Node>(this.datumId)
    if (datum && !SchemaHelper.isPageById(datum.id)) {
      const aabb = OBB.fromRect(datum, datum.rotation).aabb
      this.datumXY = XY.$(aabb.minX, aabb.minY)
    } else {
      this.datumXY = XY.$(0, 0)
    }
  }
}
