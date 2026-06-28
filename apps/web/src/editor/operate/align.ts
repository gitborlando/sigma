import { Signal } from '@gitborlando/signal'
import { Disposer } from '@gitborlando/toolkit/disposer'
import { HandleSelectService } from 'src/editor/handle/select'
import { StageSceneService } from 'src/editor/render/scene'
import { Service } from 'src/global/service'
import { SchemaHelper } from '../schema/helper'
import { UndoService } from '../core/undo'
import { YStateService } from '../y-adapter/y-state'

const alignTypes = <const>[
  'alignLeft',
  'alignCenter',
  'alignRight',
  'verticalTop',
  'verticalCenter',
  'verticalBottom',
]

export type IAlignType = (typeof alignTypes)[number]

export class OperateAlignService extends Service {
  alignTypes = alignTypes
  canAlign = Signal.create(false)
  currentAlign = Signal.create<IAlignType>()
  afterAlign = Signal.create()
  private needAlign = false
  private toAlignNodes = <S.Node[]>[]

  constructor(
    private readonly handleSelect: HandleSelectService,
    private readonly yState: YStateService,
    private readonly undo: UndoService,
    private readonly stageScene: StageSceneService,
  ) {
    super()
    autoBind(this)
  }

  subscribe = () => {
    return Disposer.combine(
      this.handleSelect.afterSelect.hook(this.setupAlign),
      this.currentAlign.hook(this.autoAlign),
    )
  }

  private setupAlign = () => {
    const selectNodes = this.handleSelect.selectIdList.map((id) =>
      this.yState.find<S.Node>(id),
    )
    if (selectNodes.length === 0) {
      this.canAlign.dispatch(false)
      return
    }
    if (selectNodes.length > 1) {
      this.toAlignNodes = [...selectNodes]
      this.canAlign.dispatch(true)
      return
    }
    if (
      selectNodes.length === 1 &&
      SchemaHelper.isById(selectNodes[0].id, 'nodeParent')
    ) {
      this.toAlignNodes = SchemaHelper.getChildren(<S.NodeParent>selectNodes[0])
      this.canAlign.dispatch(true)
      return
    }
    this.canAlign.dispatch(false)
  }

  private autoAlign = () => {
    this.yState.transact(() => {
      this[this.currentAlign.value]()
    })
    if (this.needAlign) {
      this.undo.track('state', t('set alignment'))
      this.needAlign = false
    }
  }

  private alignLeft() {
    const alignBound = this.getAlignBound()
    this.toAlignNodes.forEach((node) => {
      const nodeBound = this.getOBBAndBound(node)
      const shift = alignBound.minX - nodeBound.minX
      this.horizontalAlign(node, shift)
    })
  }

  private alignCenter() {
    const alignBound = this.getAlignBound()
    this.toAlignNodes.forEach((node) => {
      const nodeBound = this.getOBBAndBound(node)
      const shift =
        (alignBound.maxX - alignBound.minX) / 2 -
        (nodeBound.maxX - nodeBound.minX) / 2
      this.horizontalAlign(node, shift)
    })
  }

  private alignRight() {
    const alignBound = this.getAlignBound()
    this.toAlignNodes.forEach((node) => {
      const nodeBound = this.getOBBAndBound(node)
      const shift = alignBound.maxX - nodeBound.maxX
      this.horizontalAlign(node, shift)
    })
  }

  private verticalTop() {
    const alignBound = this.getAlignBound()
    this.toAlignNodes.forEach((node) => {
      const nodeBound = this.getOBBAndBound(node)
      const shift = alignBound.minY - nodeBound.minY
      this.verticalAlign(node, shift)
    })
  }

  private verticalCenter() {
    const alignBound = this.getAlignBound()
    this.toAlignNodes.forEach((node) => {
      const nodeBound = this.getOBBAndBound(node)
      const shift =
        (alignBound.maxY - alignBound.minY) / 2 -
        (nodeBound.maxY - nodeBound.minY) / 2
      this.verticalAlign(node, shift)
    })
  }

  private verticalBottom() {
    const alignBound = this.getAlignBound()
    this.toAlignNodes.forEach((node) => {
      const nodeBound = this.getOBBAndBound(node)
      const shift = alignBound.maxY - nodeBound.maxY
      this.verticalAlign(node, shift)
    })
  }

  private horizontalAlign(node: S.Node, shift: number) {
    if (shift === 0) return
    this.needAlign = true
    this.yState.set<S.Node>([node.id, 'x'], node.x + shift)
  }

  private verticalAlign(node: S.Node, shift: number) {
    if (shift === 0) return
    this.needAlign = true
    this.yState.set<S.Node>([node.id, 'y'], node.y + shift)
  }

  private getAlignBound() {
    if (this.handleSelect.selectIdList.length > 1) {
      const aabbList = this.toAlignNodes.map((node) => this.getOBBAndBound(node))
      return AABB.merge(aabbList)
    }

    const [node] = this.toAlignNodes
    return this.stageScene.findElem(node.id).obb.aabb
  }

  private getOBBAndBound(node: S.Node) {
    const nodeOBB = this.stageScene.findElem(node.id).obb
    return nodeOBB.aabb
  }
}
