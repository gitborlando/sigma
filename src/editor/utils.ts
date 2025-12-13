import { getEditorSetting } from 'src/editor/editor/setting'
import { IRect } from 'src/editor/math'

export function snapGridRound(value: number) {
  if (getEditorSetting().snapToGrid) {
    return Math.round(value)
  }
  return value
}

export function snapGridRoundXY(xy: IXY) {
  return XY._(snapGridRound(xy.x), snapGridRound(xy.y))
}

export function arrayLoopGet(arr: any[], index: number) {
  const loopIndex = index < 0 ? arr.length - 1 : index >= arr.length ? 0 : index
  return arr[loopIndex]
}

export function intersectRect(mrect1: IRect, mrect2: IRect) {
  return (
    mrect1.x + mrect1.width >= mrect2.x &&
    mrect1.x <= mrect2.x + mrect2.width &&
    mrect1.y + mrect1.height >= mrect2.y &&
    mrect1.y <= mrect2.y + mrect2.height
  )
}
