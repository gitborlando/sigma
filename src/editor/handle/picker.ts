import autobind from 'class-autobind-decorator'
import { IFill, IFillKeys } from 'src/editor/schema/type'
import Immui, { ImmuiPatch } from 'src/shared/immui/immui'
import { IXY } from 'src/shared/utils/normal'

type IOperateType = 'solid-color'

@autobind
class UIPickerService {
  fill!: IFill
  show = Signal.create(false)
  type = Signal.create(<'color' | 'linearGradient' | 'image'>'color')
  xy = Signal.create(<IXY>XY.$(0, 0))
  beforeOperate = Signal.create(<{ type: IOperateType }>{})
  afterOperate = Signal.create(<{ type: IOperateType; value?: any }>{})
  loadingWebImageUrl = Signal.create('')
  from = <'fill' | 'stroke' | 'shadow'>''
  index = 0
  onChange = Signal.create<ImmuiPatch[]>()
  private immui = new Immui()
  initHook() {
    // this.onChange.intercept((patches) => {
    //   return patches.map((patch) => ({ ...patch, path: patch.path.slice(2) }))
    // })
  }
  setFill(keys: IFillKeys[], value: any) {
    this.immui.reset([this.fill], [0, ...keys], value)
  }
  changeFill(newFill: IFill) {
    this.immui.reset([this.fill], [0], newFill)
    this.emitChange()
    this.afterOperate.dispatch()
  }
  setFillSolidColor(color: string, alpha: number) {
    this.setFill(['color'], color)
    this.setFill(['alpha'], alpha)
    this.emitChange()
  }
  setStopColor(index: number, color: string, alpha: number) {
    this.setFill(['stops', index, 'color'], color)
    this.setFill(['stops', index, 'alpha'], alpha)
    this.emitChange()
  }
  setFillUrl(url: string) {
    this.setFill(['url'], url)
    this.emitChange()
    this.afterOperate.dispatch()
  }
  emitChange() {
    const patches = this.immui.next([this.fill])[1]
    this.onChange.dispatch(patches)
  }
}

export const UIPickerCopy = new UIPickerService()
