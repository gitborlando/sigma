import { AABB } from '@gitborlando/geo'
import { NodeController } from 'src/editor/controller/node'
import { MRect } from 'src/editor/geometry'
import { HandleNode } from 'src/editor/handle/node'
import { RenderTree } from 'src/editor/render/tree'
import { Service } from 'src/global/service'
import { Undo } from '../../core/undo'
import { SchemaHelper } from '../../schema/helper'
import { YState } from '../../y-adapter/y-state'

const alignTypes = <const>[
  'alignLeft',
  'alignCenter',
  'alignRight',
  'verticalTop',
  'verticalCenter',
  'verticalBottom',
]

export type IAlignType = (typeof alignTypes)[number]

@reflection
export class DesignAlign extends Service {
  alignTypes = alignTypes
  @observable canAlign = false

  private toAlignNodes = <S.Node[]>[]
  private aligned = false

  constructor(
    private readonly yState: YState,
    private readonly undo: Undo,
    private readonly renderTree: RenderTree,
    private readonly nodeController: NodeController,
    private readonly handleNode: HandleNode,
  ) {
    super()
    autoBind(makeObservable(this))
    this.effect(autorun(this.setup))
  }

  setAlign(align: IAlignType) {
    this.setup()
    this.yState.transact(() => {
      this[align]?.(this.getAlignBound())
    })
    if (this.aligned) {
      this.undo.track('state', t('set alignment'))
      this.aligned = false
    }
  }

  private setup() {
    const selectedNodes = this.nodeController.selectNodes

    if (selectedNodes.length === 0) {
      this.canAlign = false
    } else if (selectedNodes.length > 1) {
      this.toAlignNodes = [...selectedNodes]
      this.canAlign = true
    } else if (
      selectedNodes.length === 1 &&
      SchemaHelper.isById(selectedNodes[0].id, 'nodeParent')
    ) {
      this.toAlignNodes = SchemaHelper.getChildren(<S.NodeParent>selectedNodes[0])
      this.canAlign = true
    } else this.canAlign = false
  }

  private alignLeft(alignBound: AABB) {
    this.toAlignNodes.forEach((node) => {
      const nodeBound = this.getNodeAABB(node)
      const shift = alignBound.minX - nodeBound.minX
      this.setAlignState(node, XY.$(shift, 0))
    })
  }

  private alignCenter(alignBound: AABB) {
    this.toAlignNodes.forEach((node) => {
      const nodeBound = this.getNodeAABB(node)
      const alignMiddle = (alignBound.maxX - alignBound.minX) / 2 + alignBound.minX
      const nodeMiddle = (nodeBound.maxX - nodeBound.minX) / 2 + nodeBound.minX
      const shift = alignMiddle - nodeMiddle
      this.setAlignState(node, XY.$(shift, 0))
    })
  }

  private alignRight(alignBound: AABB) {
    this.toAlignNodes.forEach((node) => {
      const nodeBound = this.getNodeAABB(node)
      const shift = alignBound.maxX - nodeBound.maxX
      this.setAlignState(node, XY.$(shift, 0))
    })
  }

  private verticalTop(alignBound: AABB) {
    this.toAlignNodes.forEach((node) => {
      const nodeBound = this.getNodeAABB(node)
      const shift = alignBound.minY - nodeBound.minY
      this.setAlignState(node, XY.$(0, shift))
    })
  }

  private verticalCenter(alignBound: AABB) {
    this.toAlignNodes.forEach((node) => {
      const nodeBound = this.getNodeAABB(node)
      const alignMiddle = (alignBound.maxY - alignBound.minY) / 2 + alignBound.minY
      const nodeMiddle = (nodeBound.maxY - nodeBound.minY) / 2 + nodeBound.minY
      const shift = alignMiddle - nodeMiddle
      this.setAlignState(node, XY.$(0, shift))
    })
  }

  private verticalBottom(alignBound: AABB) {
    this.toAlignNodes.forEach((node) => {
      const nodeBound = this.getNodeAABB(node)
      const shift = alignBound.maxY - nodeBound.maxY
      this.setAlignState(node, XY.$(0, shift))
    })
  }

  private setAlignState(node: S.Node, shift: IXY) {
    if (shift.x === 0 && shift.y === 0) return

    const mrect = this.handleNode.getMRect(node)
    const newMRect = MRect.of(mrect).shift(shift)
    this.yState.set<S.Node>([node.id, 'matrix'], newMRect.matrix)
    this.aligned = true
  }

  private getAlignBound() {
    if (this.toAlignNodes.length > 1) {
      const aabbList = this.toAlignNodes.map((node) => this.getNodeAABB(node))
      return AABB.merge(aabbList)
    }
    if (this.toAlignNodes.length === 1) {
      const [node] = this.toAlignNodes
      return this.getNodeAABB(node)
    }
    return new AABB(0, 0, 0, 0)
  }

  private getNodeAABB(node: S.Node) {
    return this.renderTree.findElem(node.id).aabb
  }
}
