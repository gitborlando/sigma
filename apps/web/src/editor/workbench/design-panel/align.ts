import { AABB } from '@gitborlando/geo'
import { reflection } from 'first-di'
import { NodeController } from 'src/editor/controller/node'
import { MRect } from 'src/editor/geometry'
import { HandleNodeService } from 'src/editor/handle/node'
import { RenderTreeService } from 'src/editor/render/tree'
import { Service } from 'src/global/service'
import { UndoService } from '../../core/undo'
import { SchemaHelper } from '../../schema/helper'
import { YStateService } from '../../y-adapter/y-state'

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
export class DesignAlignService extends Service {
  alignTypes = alignTypes
  @observable canAlign = false

  private toAlignNodes = <S.Node[]>[]

  constructor(
    private readonly yState: YStateService,
    private readonly undo: UndoService,
    private readonly renderTree: RenderTreeService,
    private readonly nodeController: NodeController,
    private readonly handleNode: HandleNodeService,
  ) {
    super()
    autoBind(makeObservable(this))
    this.effect(autorun(this.setupAlign))
  }

  setAlign(align: IAlignType) {
    this.yState.transact(() => {
      this[align]?.(this.getAlignBound())
    })
  }

  private setupAlign() {
    const selectNodes = this.nodeController.selectNodes

    if (selectNodes.length === 0) {
      this.canAlign = false
    } else if (selectNodes.length > 1) {
      this.toAlignNodes = [...selectNodes]
      this.canAlign = true
    } else if (
      selectNodes.length === 1 &&
      SchemaHelper.isById(selectNodes[0].id, 'nodeParent')
    ) {
      this.toAlignNodes = SchemaHelper.getChildren(<S.NodeParent>selectNodes[0])
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
      const shift =
        (alignBound.maxX - alignBound.minX) / 2 -
        (nodeBound.maxX - nodeBound.minX) / 2
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
      const shift =
        (alignBound.maxY - alignBound.minY) / 2 -
        (nodeBound.maxY - nodeBound.minY) / 2
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
    this.undo.track('state', t('set alignment'))
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
