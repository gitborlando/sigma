import autobind from 'class-autobind-decorator'
import { StageScene } from 'src/editor/render/scene'
import { Schema } from '../schema/schema'
import { INode, INodeParent } from '../schema/type'
import { OperateNode, getSelectNodes } from './node'

const alignTypes = <const>[
  'alignLeft',
  'alignCenter',
  'alignRight',
  'verticalTop',
  'verticalCenter',
  'verticalBottom',
]

export type IAlignType = (typeof alignTypes)[number]

@autobind
class OperateAlignService {
  alignTypes = alignTypes
  canAlign = Signal.create(false)
  currentAlign = Signal.create<IAlignType>()
  afterAlign = Signal.create()
  private needAlign = false
  private toAlignNodes = <INode[]>[]

  initHook() {
    OperateNode.selectedNodes$.hook(this.setupAlign)
    this.currentAlign.hook(this.autoAlign)
  }

  private setupAlign() {
    const selectNodes = getSelectNodes()
    if (selectNodes.length === 0) {
      this.canAlign.dispatch(false)
    }
    if (selectNodes.length > 1) {
      this.toAlignNodes = [...selectNodes]
      this.canAlign.dispatch(true)
    }
    if (
      selectNodes.length === 1 &&
      SchemaUtil.isById(selectNodes[0].id, 'nodeParent')
    ) {
      this.toAlignNodes = SchemaUtil.getChildren(<INodeParent>selectNodes[0])
      this.canAlign.dispatch(true)
    }
  }

  private autoAlign() {
    this[this.currentAlign.value]()
    if (this.needAlign) {
      Schema.finalOperation('设置对齐')
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

  private horizontalAlign(node: INode, shift: number) {
    if (shift === 0) return
    this.needAlign = true
    SchemaUtil.traverseIds([node.id], ({ node }) => {
      Schema.itemReset(node, ['x'], node.x + shift)
      return false
    })
  }

  private verticalAlign(node: INode, shift: number) {
    if (shift === 0) return
    this.needAlign = true
    SchemaUtil.traverseIds([node.id], ({ node }) => {
      Schema.itemReset(node, ['y'], node.y + shift)
      return false
    })
  }

  private getAlignBound() {
    if (getSelectNodes().length > 1) {
      // return StageTransform.transformOBB.aabb
    } else {
      return StageScene.findElem(getSelectNodes()[0].id).obb.aabb
    }
  }

  private getOBBAndBound(node: INode) {
    const nodeOBB = StageScene.findElem(node.id).obb
    return nodeOBB.aabb
  }
}

export const OperateAlign = new OperateAlignService()
