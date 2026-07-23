import { DesignFill } from 'src/editor/workbench/design/fill'
import { DesignStroke } from 'src/editor/workbench/design/stroke'
import { Service } from 'src/global/service'

type DesignPickerTarget = 'fill' | 'stroke'

@reflection
export class DesignPicker extends Service {
  @observable pickerPos = XY.$()
  @observable fillIndex = -1
  @observable isShowPicker = false
  @observable fillType: S.Fill['type'] = 'color'
  @observable target: DesignPickerTarget = 'fill'

  constructor(
    private readonly designFill: DesignFill,
    private readonly designStroke: DesignStroke,
  ) {
    super()
    autoBind(makeObservable(this))
  }

  get fill() {
    return this.target === 'fill'
      ? this.designFill.fills[this.fillIndex]
      : this.designStroke.stroke.fills[this.fillIndex]
  }

  @action
  showPicker(fillIndex: number, pos: IXY, target: DesignPickerTarget = 'fill') {
    this.fillIndex = fillIndex
    this.pickerPos = pos
    this.isShowPicker = true
    this.target = target
    this.fillType = this.fill!.type
  }

  @action
  hidePicker() {
    this.fillType = 'color'
    this.isShowPicker = false
  }

  changeFill(newFill: S.Fill) {
    this.setFill(() => newFill)
  }

  setFill<T extends S.Fill>(setter: (fill: T) => T | void) {
    if (this.target === 'fill') {
      this.designFill.setFill(this.fillIndex, setter)
      return
    }
    this.designStroke.setFill(this.fillIndex, setter)
  }

  getRgbaFromSolidFill(fill: S.FillColor) {
    const { color, alpha } = fill
    return color.replace('rgb', 'rgba').replace(')', `,${alpha})`)
  }

  setRgbaToSolidFill(color: string, alpha: number) {
    this.setFill((draft) => {
      if (draft.type !== 'color') return draft
      draft.color = color
      draft.alpha = alpha
    })
  }
}
