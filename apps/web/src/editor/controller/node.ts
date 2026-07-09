import { iife, objKeys } from '@gitborlando/utils'
import { Undo } from 'src/editor/core/undo'
import { HandleNode } from 'src/editor/handle/node'
import { HandleSelect, type Selection } from 'src/editor/handle/select'
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
  ) {
    super()
    autoBind(this)
  }

  @computed get selectNodes() {
    return this.handleSelect.selectIdList.map((id) => this.yState.find<S.Node>(id))
  }

  deleteSelectedNodes() {
    this.yState.transact(() => {
      const traverse = createSchemaTraverse({
        schema: this.yState.schema,
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
        schema: this.yState.schema,
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
    const selected = this.handleSelect.selectIdList.map((id) =>
      this.yState.find<S.Node>(id),
    )

    this.yState.transact(() => {
      selected.forEach((node) => {
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
    const selected = this.handleSelect.selectIdList.map((id) =>
      this.yState.find<S.Node>(id),
    )
    if (selected.length === 0) return

    const frameOBB = this.handleNode.getNodesMergedOBB(selected)
    const frameNode = this.schemaCreator.frame({ ...frameOBB })
    const oldParent = this.yState.find<S.NodeParent>(selected[0].parentId)
    const index = oldParent.childIds.indexOf(selected[0].id)

    this.yState.transact(() => {
      this.handleNode.addNodes([frameNode])
      this.handleNode.insertChildAt(oldParent, frameNode, index)
      selected.forEach((node) => this.handleNode.removeChild(oldParent, node))
      selected.forEach((node) => this.handleNode.insertChildAt(frameNode, node))
    })
    this.undo.untrack(
      action(() => {
        this.handleSelect.replaceSelection({ [frameNode.id]: true })
      }),
    )
    this.undo.track('all', t('create frame'))
  }
}
