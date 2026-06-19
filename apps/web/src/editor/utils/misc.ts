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

export const snapHalfPixel = (n: number) => {
  return Math.round(n - 0.5) + 0.5
}

export function arrayLoopGet(arr: any[], index: number) {
  const loopIndex = index < 0 ? arr.length - 1 : index >= arr.length ? 0 : index
  return arr[loopIndex]
}

export function reverseFor<T>(
  items: T[],
  callback: (item: T, index: number) => any,
) {
  for (let i = items.length - 1; i >= 0; i--) callback(items[i], i)
}

export class Raf {
  private ids: number[] = []

  request(callback: (next: () => void) => void) {
    const id = requestAnimationFrame(() => callback(() => this.request(callback)))
    this.ids.push(id)
    return this
  }

  cancelAll() {
    this.ids.forEach(cancelAnimationFrame)
    return this
  }
}

export const expandOneStep = (
  number: number,
  step: number,
  direction: 'left' | 'right',
) => {
  const n = (number / step) | 0
  return direction === 'left' ? (n - 1) * step : (n + 1) * step
}

export function isNumberEqual(a: number, b: number, precision = 0.00001) {
  return Math.abs(a - b) < precision
}
