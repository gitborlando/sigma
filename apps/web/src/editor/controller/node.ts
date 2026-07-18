import { firstOne, iife, objKeys } from '@gitborlando/utils'
import { Undo } from 'src/editor/core/undo'
import { Matrix } from 'src/editor/geometry'
import { MRect } from 'src/editor/geometry/mrect'
import { HandleNode } from 'src/editor/handle/node'
import { HandleSelect, type Selection } from 'src/editor/handle/select'
import { RenderTree } from 'src/editor/render/tree'
import { SchemaCreator } from 'src/editor/schema/creator'
import { SchemaHelper } from 'src/editor/schema/helper'
import { createSchemaTraverse } from 'src/editor/schema/traverse'
import { YState } from 'src/editor/y-adapter/y-state'
import { Service } from 'src/global/service'

@reflection
export class NodeController extends Service {
  constructor(
    private readonly handleNode: HandleNode,
    private readonly handleSelect: HandleSelect,
    private readonly yState: YState,
    private readonly undo: Undo,
    private readonly schemaCreator: SchemaCreator,
    private readonly renderTree: RenderTree,
  ) {
    super()
    autoBind(this)
  }

  @computed get datumXY() {
    return this.getDatumXY()
  }

  @computed get selectNodes() {
    return this.handleSelect.selectIdList.map((id) => this.yState.find<S.Node>(id))
  }

  selectAllNodes() {
    const selectIds = SchemaHelper.getPageChildIds(
      this.handleSelect.selectPageId,
    ).map((id) => [id, true])
    const selection = Object.fromEntries(selectIds)
    this.handleSelect.replaceSelection(selection)
    this.undo.track('client', t('select all nodes'))
  }

  deleteSelectedNodes() {
    this.yState.transact(() => {
      const traverse = createSchemaTraverse({
        leave: ({ item, parent }) => {
          if (!parent || !SchemaHelper.isNode(item)) return
          this.handleNode.deleteChild(parent, item)
        },
      })
      traverse(this.handleSelect.selectIdList)
      this.handleSelect.clearSelect()
    })
    this.undo.track('all', t('delete nodes'))
  }

  copiedIds = <ID[]>[]

  copySelectedNodes() {
    this.copiedIds = [...this.handleSelect.selectIdList]
  }

  pasteNodes() {
    if (!this.copiedIds.length) return

    const newSelection = <Selection>{}

    this.yState.transact(() => {
      const traverse = createSchemaTraverse<{ newNode?: S.Node | S.NodeParent }>({
        enter: (ctx) => {
          const { item, parent, forwardCtx, depth } = ctx
          if (!parent || !SchemaHelper.isNode(item)) return false

          const newParent = forwardCtx?.newNode || parent
          const newNode = this.schemaCreator.clone(item, {
            name: this.schemaCreator.createNodeName(item.type),
          })
          this.handleNode.addNodes([newNode])
          this.handleNode.insertChildAt(newParent as S.NodeParent, newNode)
          ctx.newNode = newNode
          if (depth === 0) newSelection[newNode.id] = true
        },
      })
      traverse(this.copiedIds)
      this.copiedIds = []
    })

    this.handleSelect.replaceSelection(newSelection)

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
        this.handleNode.reHierarchy(parent, node, index)
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
      selected.forEach((node) => this.handleNode.removeChild(oldParent.id, node.id))
      this.handleNode.addNodes([frameNode])
      this.handleNode.insertChildAt(oldParent, frameNode, index)
      selected.forEach((node) => {
        this.handleNode.insertChildAt(frameNode, node)
        this.yState.set<S.Node>(
          [node.id, 'matrix'],
          Matrix.of(node.matrix).shift({ x: -rect.x, y: -rect.y }).plain(),
        )
      })
    })
    this.handleSelect.replaceSelection({ [frameNode.id]: true })

    this.undo.track('all', t('create frame'))
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
      const aabb = this.renderTree.findElem(datum.id).aabb
      return XY.$(aabb.minX, aabb.minY)
    } else {
      return XY.$(0, 0)
    }
  }
}
