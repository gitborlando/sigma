import { firstOne, iife, objKeys } from '@gitborlando/utils'
import { Undo } from 'src/editor/action/undo'
import { HitTest, IMRect, Matrix } from 'src/editor/geometry'
import { MRect } from 'src/editor/geometry/mrect'
import { RenderTree } from 'src/editor/render/tree'
import { SchemaCreator } from 'src/editor/schema/creator'
import { SchemaHelper } from 'src/editor/schema/helper'
import { SchemaMutator } from 'src/editor/schema/mutator'
import { createSchemaTraverse } from 'src/editor/schema/traverse'
import { Select, type Selection } from 'src/editor/select'
import { StageEvent } from 'src/editor/stage/event'
import { YState } from 'src/editor/y-adapter/y-state'
import { Service } from 'src/global/service'

@reflection
export class NodeAction extends Service {
  @observable renamingNodeId = ''

  constructor(
    private readonly schemaMutator: SchemaMutator,
    private readonly select: Select,
    private readonly yState: YState,
    private readonly undo: Undo,
    private readonly schemaCreator: SchemaCreator,
    private readonly renderTree: RenderTree,
    private readonly stageEvent: StageEvent,
  ) {
    super()
    autoBind(makeObservable(this))
  }

  @computed get datumXY() {
    return this.getDatumXY()
  }

  @computed get selectNodes() {
    return this.select.selectIds.map((id) => this.yState.observedState[id] as S.Node)
  }

  renameNode(id: string, name: string) {
    this.yState.transact(() => {
      this.yState.set<S.Node>([id, 'name'], name)
    })
    this.undo.track('state', t('rename node'))
  }

  selectAllNodes() {
    const selectIds = SchemaHelper.getPageChildIds(this.select.selectPageId).map(
      (id) => [id, true],
    )
    const selection = Object.fromEntries(selectIds)

    this.select.replaceSelection(selection)
    this.undo.track('client', t('select all nodes'))
  }

  deleteSelectedNodes() {
    const traverse = createSchemaTraverse({
      leave: ({ item, parent }) => {
        if (!parent || !SchemaHelper.isNode(item)) return
        this.schemaMutator.deleteChild(parent, item)
      },
    })

    this.yState.transact(() => {
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
    const traverse = createSchemaTraverse<{ newNode?: S.Node | S.NodeParent }>({
      enter: (ctx) => {
        const { item, parent, forwardCtx, depth } = ctx
        if (!parent || !SchemaHelper.isNode(item)) return false

        const newParent = forwardCtx?.newNode || parent
        const newNode = SchemaHelper.clone(item, {
          name: this.schemaCreator.createNodeName(item.type),
        })
        this.schemaMutator.addNodes([newNode])
        this.schemaMutator.insertChildAt(newParent as S.NodeParent, newNode)
        ctx.newNode = newNode
        if (depth === 0) newSelection[newNode.id] = true
      },
    })

    this.yState.transact(() => {
      traverse(this.copiedIds)
      this.copiedIds = []
    })
    this.select.replaceSelection(newSelection)

    this.undo.track('all', `${t('paste nodes')}: ${objKeys(newSelection).length}`)
  }

  reHierarchySelectedNode(type: 'up' | 'down' | 'top' | 'bottom') {
    this.yState.transact(() => {
      this.selectNodes.forEach((node) => {
        const parent = this.yState.find<S.NodeParent>(node.parentId)
        let index = parent.childIds.indexOf(node.id)
        index = iife(() => {
          if (type === 'up') return index - 1
          if (type === 'down') return index + 1
          if (type === 'top') return 0
          return parent.childIds.length - 1
        })
        this.schemaMutator.reHierarchy(parent, node, index)
      })
    })

    this.undo.track('all', t('reorder nodes'))
  }

  wrapInFrame() {
    const selected = this.selectNodes
    if (selected.length === 0) return

    const aabbList = selected.map((node) => this.renderTree.findElem(node.id).aabb)
    const rect = AABB.rect(AABB.merge(aabbList))

    const frameNode = this.schemaCreator.frame({
      ...MRect.identity(rect.width, rect.height).shift(rect).plain(),
    })

    const oldParent = this.yState.find<S.NodeParent>(selected[0].parentId)
    const index = oldParent.childIds.indexOf(selected[0].id)

    this.yState.transact(() => {
      selected.forEach((node) =>
        this.schemaMutator.removeChild(oldParent.id, node.id),
      )
      this.schemaMutator.addNodes([frameNode])
      this.schemaMutator.insertChildAt(oldParent, frameNode, index)
      selected.forEach((node) => {
        this.schemaMutator.insertChildAt(frameNode, node)
        this.yState.set<S.Node>(
          [node.id, 'matrix'],
          Matrix.of(node.matrix).shift({ x: -rect.x, y: -rect.y }).plain(),
        )
      })
    })
    this.select.replaceSelection({ [frameNode.id]: true })

    this.undo.track('all', t('create frame'))
  }

  moveNodesInOrOutFrame(sceneXY: IXY) {
    const elems = this.stageEvent.hitSceneElems
    const hitTopFrameElem = elems.find((elem) => elem.node.type === 'frame')
    const estimatedParent: S.NodeParent & IMRect = hitTopFrameElem
      ? (hitTopFrameElem.node as S.Frame)
      : Object.assign(
          this.select.selectedPage,
          MRect.identity(Infinity, Infinity).plain(),
        )
    if (!estimatedParent) return false

    let moved = false
    const parent = estimatedParent
    const parentRootMatrix =
      parent.type === 'page' ? parent.matrix : SchemaHelper.getRootMatrix(parent)
    const xy = Matrix.getLocalXY(sceneXY, parentRootMatrix)

    this.selectNodes.forEach((node) => {
      if (parent.id === node.parentId || parent.id === node.id) return

      if (HitTest.hitRoundRect(parent.width, parent.height, 0)(xy)) {
        const nodeRootMatrix = SchemaHelper.getRootMatrix(node)
        const nodeLocalMatrix = Matrix.getLocal(nodeRootMatrix, parentRootMatrix)

        this.schemaMutator.removeChild(node.parentId, node.id)
        this.schemaMutator.insertChildAt(parent, node)
        this.schemaMutator.setMatrix(node, nodeLocalMatrix.plain())

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
      const aabb = this.renderTree.findElem(datum.id).aabb
      return XY.$(aabb.minX, aabb.minY)
    } else {
      return XY.$(0, 0)
    }
  }
}
