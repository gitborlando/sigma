import { clone, firstOne, iife, objKeys } from '@gitborlando/utils'
import { Undo } from 'src/editor/action/undo'
import { DocCreator } from 'src/editor/doc/creator'
import { findGraph, findNode, findParent } from 'src/editor/doc/finder'
import { DocHelper } from 'src/editor/doc/helper'
import { DocMutator } from 'src/editor/doc/mutator'
import { createGraphTraverse } from 'src/editor/doc/traverse'
import { HitTest, IMRect, Matrix } from 'src/editor/geometry'
import { MRect } from 'src/editor/geometry/mrect'
import { RenderTree } from 'src/editor/render/tree'
import { Select, type Selection } from 'src/editor/select'
import { StageEvent } from 'src/editor/stage/event'
import { YDoc } from 'src/editor/y-adapter/y-doc'
import { GRAPHS } from 'src/global/constant'
import { Service } from 'src/global/service'

@reflection
export class NodeAction extends Service {
  @observable renamingNodeId = ''

  constructor(
    private readonly docMutator: DocMutator,
    private readonly select: Select,
    private readonly yDoc: YDoc,
    private readonly undo: Undo,
    private readonly docCreator: DocCreator,
    private readonly renderTree: RenderTree,
    private readonly stageEvent: StageEvent,
  ) {
    super()
    autoBind(makeObservable(this))
  }

  @computed get datumXY() {
    return this.getDatumXY()
  }

  renameNode(id: string, name: string) {
    this.yDoc.transact(() => {
      this.yDoc.set<S.Node>([GRAPHS, id, 'name'], name)
    })
    this.renamingNodeId = ''

    this.undo.track('state', t('rename node'))
  }

  selectAllNodes() {
    const selectIds = this.select.getSelectedPage().childIds.map((id) => [id, true])
    const selection = Object.fromEntries(selectIds)
    this.select.replaceSelection(selection)

    this.undo.track('client', t('select all nodes'))
  }

  deleteSelectedNodes() {
    const traverse = createGraphTraverse({
      leave: ({ graph, parent }) => {
        if (!parent || !DocHelper.isNode(graph)) return
        this.docMutator.deleteChild(parent, graph)
      },
    })

    this.yDoc.transact(() => {
      traverse(this.select.selectIds)
      this.select.clearSelect()
    })

    this.undo.track('all', t('delete nodes'))
  }

  copiedIds = <ID[]>[]

  copySelectedNodes() {
    this.copiedIds = [...this.select.selectIds]
  }

  pasteNodes() {
    if (!this.copiedIds.length) return

    const newSelection = <Selection>{}
    const traverse = createGraphTraverse<{ newNode?: S.Node | S.Parent }>({
      enter: (ctx) => {
        const { graph, parent, forwardCtx, depth } = ctx
        if (!parent || !DocHelper.isNode(graph)) return false

        const newParent = forwardCtx?.newNode || parent
        const newNode = DocHelper.clone(graph, {
          name: this.docCreator.createNodeName(graph.type),
        })
        this.docMutator.addNodes([newNode])
        this.docMutator.insertChildAt(newParent as S.Parent, newNode)
        ctx.newNode = newNode
        if (depth === 0) newSelection[newNode.id] = true
      },
    })

    this.yDoc.transact(() => {
      traverse(this.copiedIds)
      this.copiedIds = []
    })
    this.select.replaceSelection(newSelection)

    this.undo.track('all', `${t('paste nodes')}: ${objKeys(newSelection).length}`)
  }

  reHierarchySelectedNode(type: 'up' | 'down' | 'top' | 'bottom') {
    this.yDoc.transact(() => {
      this.select.getSelectedNodes().forEach((node) => {
        const parent = findParent(node.parentId)
        let index = parent.childIds.indexOf(node.id)
        index = iife(() => {
          if (type === 'up') return index - 1
          if (type === 'down') return index + 1
          if (type === 'top') return 0
          return parent.childIds.length - 1
        })
        this.docMutator.reHierarchy(parent, node, index)
      })
    })

    this.undo.track('all', t('reorder nodes'))
  }

  wrapInFrame() {
    const selected = this.select.getSelectedNodes()
    if (selected.length === 0) return

    const aabbList = selected.map((node) => this.renderTree.findElem(node.id).aabb)
    const rect = AABB.rect(AABB.merge(aabbList))

    const frameNode = this.docCreator.frame({
      ...MRect.identity(rect.width, rect.height).shift(rect).plain(),
    })

    const oldParent = findParent(selected[0].parentId)
    const index = oldParent.childIds.indexOf(selected[0].id)

    this.yDoc.transact(() => {
      selected.forEach((node) => this.docMutator.removeChild(oldParent.id, node.id))
      this.docMutator.addNodes([frameNode])
      this.docMutator.insertChildAt(oldParent, frameNode, index)
      selected.forEach((node) => {
        this.docMutator.insertChildAt(frameNode, node)
        this.docMutator.setMatrix(
          node,
          Matrix.of(node.matrix).shift({ x: -rect.x, y: -rect.y }).plain(),
        )
      })
    })
    this.select.replaceSelection({ [frameNode.id]: true })

    this.undo.track('all', t('create frame'))
  }

  moveNodesInOrOutFrame(sceneXY: IXY) {
    const elems = this.stageEvent.hitSceneElems
    const hitTopFrameElem = elems.find((elem) => elem.node.variant === 'frame')
    const estimatedParent: S.Parent & IMRect = hitTopFrameElem
      ? (hitTopFrameElem.node as S.Frame)
      : Object.assign(
          clone(this.select.getSelectedPage()),
          MRect.identity(Infinity, Infinity).plain(),
        )
    if (!estimatedParent) return false

    let moved = false
    const parent = estimatedParent
    const parentRootMatrix =
      parent.type === 'page' ? parent.matrix : DocHelper.getRootMatrix(parent)
    const xy = Matrix.getLocalXY(sceneXY, parentRootMatrix)

    this.select.getSelectedNodes().forEach((node) => {
      if (this.select.selection[parent.id] || parent.id === node.parentId) return

      if (HitTest.hitRoundRect(parent.width, parent.height, 0)(xy)) {
        const nodeRootMatrix = DocHelper.getRootMatrix(node)
        const nodeLocalMatrix = Matrix.getLocal(nodeRootMatrix, parentRootMatrix)

        this.docMutator.removeChild(node.parentId, node.id)
        this.docMutator.insertChildAt(parent, node)
        this.docMutator.setMatrix(node, nodeLocalMatrix.plain())

        this.stageEvent.hintId = parent.type !== 'page' ? parent.id : ''
        moved = true
      }
    })

    return moved
  }

  private getDatumXY() {
    const selectIds = this.select.selectIds
    let datumId = ''

    if (selectIds.length === 1) {
      datumId = findNode(firstOne(selectIds)!).parentId
    }
    if (selectIds.length > 1) {
      const parentIds = new Set<string>()
      selectIds.forEach((id) => parentIds.add(findNode(id).parentId))
      if (parentIds.size === 1) datumId = firstOne(parentIds)!
      if (parentIds.size > 1) datumId = ''
    }

    if (!datumId) return XY.$(0, 0)

    const graph = findGraph(datumId)
    if (!DocHelper.isPage(graph)) {
      const aabb = this.renderTree.findElem(graph.id).aabb
      return XY.$(aabb.minX, aabb.minY)
    } else {
      return XY.$(0, 0)
    }
  }
}
