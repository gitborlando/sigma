import { clone } from '@gitborlando/utils'
import autobind from 'class-autobind-decorator'
import equal from 'fast-deep-equal'
import { rgb } from 'src/utils/color'
import { UIPickerCopy } from '../handle/picker'
import { SchemaCreator } from '../schema/creator'
import { INode, IShadow } from '../schema/type'
import { getSelectedNodes } from '../utils/get'

@autobind
class OperateShadowService {
  shadows = <IShadow[]>[]
  isMultiShadows = false
  afterOperate = Signal.create()
  private immui = new (class {})()
  initHook() {
    YClients.afterSelect.hook(this.setupShadows)
    YState.subscribe((patches) => {
      if (!patches.some((patch) => patch.keys[1] === 'shadows')) return
      this.setupShadows()
    })
    this.onUiPickerSetShadow()
    this.afterOperate.hook(() => {
      YUndo.track({ type: 'state', description: '改变 shadows' })
    })
  }
  setupShadows() {
    this.shadows = []
    this.isMultiShadows = false
    const nodes = getSelectedNodes()
    if (nodes.length === 1) return (this.shadows = clone(nodes[0].shadows))
    if (nodes.length > 1) {
      if (this.isSameShadows(nodes)) return (this.shadows = clone(nodes[0].shadows))
      return (this.isMultiShadows = true)
    }
  }
  addShadow() {
    const shadowsLength = this.shadows.length
    const shadow = SchemaCreator.shadow({
      fill: SchemaCreator.fillColor(rgb(0, 0, 0), shadowsLength ? 0.25 : 1),
    })
    this.immui.add(this.shadows, [shadowsLength], shadow)
    this.applyChangeToYState()
    YUndo.track({ type: 'state', description: '添加 shadow' })
  }
  deleteShadow(index: number) {
    this.immui.delete(this.shadows, [index])
    this.applyChangeToYState()
    YUndo.track({ type: 'state', description: '删除 shadow' })
  }
  setShadow(index: number, keys: string[], value: any) {
    this.immui.reset(this.shadows, [index, ...keys], value)
    this.applyChangeToYState()
  }
  toggleShadow(index: number, keys: string[], value: any) {
    this.immui.reset(this.shadows, [index, ...keys], value)
    this.applyChangeToYState()
    YUndo.track({ type: 'state', description: '改变 shadow' })
  }
  changeShadow(index: number, newShadow: IShadow) {
    this.immui.reset(this.shadows, [index], newShadow)
    this.applyChangeToYState()
    YUndo.track({ type: 'state', description: '改变 shadows' })
  }
  applyChangeToYState() {
    this.shadows = this.immui.next(this.shadows)[0]
    YState.transact(() => {
      getSelectedNodes().forEach((node) => {
        YState.set(`${node.id}.shadows`, clone(this.shadows))
      })
    })
  }
  private onUiPickerSetShadow() {
    UIPickerCopy.onChange.hook((patches) => {
      if (UIPickerCopy.from !== 'shadow') return
      this.immui.applyPatches(this.shadows, patches, {
        prefix: `/${UIPickerCopy.index}/fill`,
      })
      this.applyChangeToYState()
    })
    UIPickerCopy.afterOperate.hook(() => {
      if (UIPickerCopy.from !== 'shadow') return
      YUndo.track({ type: 'state', description: '改变 shadows' })
    })
  }
  private isSameShadows(nodes: INode[]) {
    let isSame = true
    const firstNode = nodes[0]
    nodes.forEach(({ shadows }) => {
      if (!isSame) return
      if (shadows.length !== firstNode.shadows.length) return (isSame = false)
      firstNode.shadows.forEach((shadow, index) => {
        const otherShadow = shadows[index]
        if (!equal(shadow, otherShadow)) return (isSame = false)
      })
    })
    return isSame
  }
}

export const OperateShadow = new OperateShadowService()
