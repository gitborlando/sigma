import { Signal } from '@gitborlando/signal'
import { Disposer } from '@gitborlando/toolkit/disposer'
import { Undo } from 'src/editor/core/undo'
import { HandleSelect } from 'src/editor/handle/select'
import { StageScene } from 'src/editor/render/scene'
import { YState } from 'src/editor/y-adapter/y-state'
import { SchemaHelper } from '../schema/helper'
import { getSelectedNodes } from '../utils/get'

const alignTypes = <const>[
  'alignLeft',
  'alignCenter',
  'alignRight',
  'verticalTop',
  'verticalCenter',
  'verticalBottom',
]

export type IAlignType = (typeof alignTypes)[number]

class OperateAlignService {
  alignTypes = alignTypes
  canAlign = Signal.create(false)
  currentAlign = Signal.create<IAlignType>()
  afterAlign = Signal.create()
  private needAlign = false
  private toAlignNodes = <S.Node[]>[]

  subscribe() {
    return Disposer.combine(
      HandleSelect.afterSelect.hook(this.setupAlign),
      this.currentAlign.hook(this.autoAlign),
    )
  }

  private setupAlign() {
    const selectNodes = getSelectedNodes()
    if (selectNodes.length === 0) {
      this.canAlign.dispatch(false)
    }
    if (selectNodes.length > 1) {
      this.toAlignNodes = [...selectNodes]
      this.canAlign.dispatch(true)
    }
    if (
      selectNodes.length === 1 &&
      SchemaHelper.isById(selectNodes[0].id, 'nodeParent')
    ) {
      this.toAlignNodes = SchemaHelper.getChildren(<S.NodeParent>selectNodes[0])
      this.canAlign.dispatch(true)
    }
  }

  private autoAlign() {
    YState.transact(() => {
      this[this.currentAlign.value]()
    })
    if (this.needAlign) {
      Undo.track('state', t('set alignment'))
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
    YState.set<S.Node>([node.id, 'x'], node.x + shift)
  }

  private verticalAlign(node: S.Node, shift: number) {
    if (shift === 0) return
    this.needAlign = true
    YState.set<S.Node>([node.id, 'y'], node.y + shift)
  }

  private getAlignBound() {
    if (getSelectedNodes().length > 1) {
      const aabbList = this.toAlignNodes.map((node) => this.getOBBAndBound(node))
      return AABB.merge(aabbList)
    }

    return StageScene.findElem(getSelectedNodes()[0].id).obb.aabb
  }

  private getOBBAndBound(node: S.Node) {
    const nodeOBB = StageScene.findElem(node.id).obb
    return nodeOBB.aabb
  }
}

export const OperateAlign = autoBind(new OperateAlignService())
