import { clone } from '@gitborlando/utils'
import autobind from 'class-autobind-decorator'
import equal from 'fast-deep-equal'
import { rgb } from 'src/utils/color'
import { UIPickerCopy } from '../handle/picker'
import { SchemaCreator } from '../schema/creator'
import { INode, IStroke } from '../schema/type'
import { getSelectedNodes } from '../utils/get'

@autobind
class OperateStrokeService {
  strokes = <IStroke[]>[]
  isMultiStrokes = false
  afterOperate = Signal.create()
  private immui = new (class {})()
  initHook() {
    YClients.afterSelect.hook(this.setupStrokes)
    YState.subscribe((patches) => {
      if (!patches.some((patch) => patch.keys[1] === 'strokes')) return
      this.setupStrokes()
    })
    this.onUiPickerSetStroke()
    this.afterOperate.hook(() => {
      YUndo.track({ type: 'state', description: '改变 strokes' })
    })
  }
  setupStrokes() {
    this.strokes = []
    this.isMultiStrokes = false
    const nodes = getSelectedNodes()
    if (nodes.length === 1) return (this.strokes = clone(nodes[0].strokes))
    if (nodes.length > 1) {
      if (this.isSameStrokes(nodes)) return (this.strokes = clone(nodes[0].strokes))
      return (this.isMultiStrokes = true)
    }
  }
  addStroke() {
    const strokesLength = this.strokes.length
    const stroke = SchemaCreator.stroke({
      fill: SchemaCreator.fillColor(rgb(0, 0, 0), strokesLength ? 0.25 : 1),
    })
    this.immui.add(this.strokes, [strokesLength], stroke)
    this.applyChangeToYState()
    YUndo.track({ type: 'state', description: '添加 stroke' })
  }
  deleteStroke(index: number) {
    this.immui.delete(this.strokes, [index])
    this.applyChangeToYState()
    YUndo.track({ type: 'state', description: '删除 stroke' })
  }
  setStroke(index: number, keys: string[], value: any) {
    this.immui.reset(this.strokes, [index, ...keys], value)
    this.applyChangeToYState()
  }
  toggleStroke(index: number, keys: string[], value: any) {
    this.immui.reset(this.strokes, [index, ...keys], value)
    this.applyChangeToYState()
    YUndo.track({ type: 'state', description: '改变 stroke' })
  }
  changeStroke(index: number, newStroke: IStroke) {
    this.immui.reset(this.strokes, [index], newStroke)
    this.applyChangeToYState()
    YUndo.track({ type: 'state', description: '改变 strokes' })
  }
  applyChangeToYState() {
    this.strokes = this.immui.next(this.strokes)[0]
    YState.transact(() => {
      getSelectedNodes().forEach((node) => {
        YState.set(`${node.id}.strokes`, clone(this.strokes))
      })
    })
  }
  private onUiPickerSetStroke() {
    UIPickerCopy.onChange.hook((patches) => {
      if (UIPickerCopy.from !== 'stroke') return
      this.immui.applyPatches(this.strokes, patches, {
        prefix: `/${UIPickerCopy.index}/fill`,
      })
      this.applyChangeToYState()
    })
    UIPickerCopy.afterOperate.hook(() => {
      if (UIPickerCopy.from !== 'stroke') return
      YUndo.track({ type: 'state', description: '改变 strokes' })
    })
  }
  private isSameStrokes(nodes: INode[]) {
    let isSame = true
    const firstNode = nodes[0]
    nodes.forEach(({ strokes }) => {
      if (!isSame) return
      if (strokes.length !== firstNode.strokes.length) return (isSame = false)
      firstNode.strokes.forEach((stroke, index) => {
        const otherStroke = strokes[index]
        if (!equal(stroke, otherStroke)) return (isSame = false)
      })
    })
    return isSame
  }
}

export const OperateStroke = new OperateStrokeService()
