import { getEditorSetting } from 'src/editor/editor/setting'

export function snapGridRound(value: number) {
  if (getEditorSetting().snapToGrid) {
    return Math.round(value)
  }
  return value
}

export function snapGridRoundXY(xy: IXY) {
  return XY._(snapGridRound(xy.x), snapGridRound(xy.y))
}
