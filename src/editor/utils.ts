import { getEditorSetting } from 'src/editor/editor/setting'

export type TRBL = 'top' | 'right' | 'bottom' | 'left'

export function snapGridRound(value: number) {
  if (getEditorSetting().snapToGrid) {
    return Math.round(value)
  }
  return value
}

export function snapGridRoundXY(xy: IXY) {
  return XY.$(snapGridRound(xy.x), snapGridRound(xy.y))
}

export function arrayLoopGet(arr: any[], index: number) {
  const loopIndex = index < 0 ? arr.length - 1 : index >= arr.length ? 0 : index
  return arr[loopIndex]
}
