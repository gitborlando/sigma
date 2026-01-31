import { OperateFill } from 'src/editor/operate/fill'

class FillPickerStateService {
  @observable pickerPos = XY.$()
  @observable fillIndex = -1
  @observable isShowPicker = false
  @observable fillType: S.Fill['type'] = 'color'

  @action
  showPicker(fillIndex: number, pos: IXY) {
    this.fillIndex = fillIndex
    this.pickerPos = pos
    this.isShowPicker = true
    this.fillType = OperateFill.fills[fillIndex].type
  }

  @action
  hidePicker() {
    this.fillType = 'color'
    this.isShowPicker = false
  }

  changeFill(newFill: S.Fill) {
    OperateFill.setFill(this.fillIndex, () => newFill)
  }

  getRgbaFromSolidFill(fill: S.FillColor) {
    const { color, alpha } = fill
    return color.replace('rgb', 'rgba').replace(')', `,${alpha})`)
  }

  setRgbaToSolidFill(color: string, alpha: number) {
    OperateFill.setFill(this.fillIndex, (draft) => {
      if (draft.type !== 'color') return draft
      draft.color = color
      draft.alpha = alpha
    })
  }

  onColorChange(color: string, alpha: number) {}

  onAfterPick(color: string, alpha: number) {}
}

export const FillPickerState = autoBind(makeObservable(new FillPickerStateService()))
