import { OperateFill } from 'src/editor/operate/fill'
import { Service } from 'src/global/service'

@reflection
export class FillPicker extends Service {
  @observable pickerPos = XY.$()
  @observable fillIndex = -1
  @observable isShowPicker = false
  @observable fillType: S.Fill['type'] = 'color'

  constructor(private readonly operateFill: OperateFill) {
    super()
    autoBind(makeObservable(this))
  }

  @action
  showPicker(fillIndex: number, pos: IXY) {
    this.fillIndex = fillIndex
    this.pickerPos = pos
    this.isShowPicker = true
    this.fillType = this.operateFill.fills[fillIndex].type
  }

  @action
  hidePicker() {
    this.fillType = 'color'
    this.isShowPicker = false
  }

  changeFill(newFill: S.Fill) {
    this.operateFill.setFill(this.fillIndex, () => newFill)
  }

  getRgbaFromSolidFill(fill: S.FillColor) {
    const { color, alpha } = fill
    return color.replace('rgb', 'rgba').replace(')', `,${alpha})`)
  }

  setRgbaToSolidFill(color: string, alpha: number) {
    this.operateFill.setFill(this.fillIndex, (draft) => {
      if (draft.type !== 'color') return draft
      draft.color = color
      draft.alpha = alpha
    })
  }
}
