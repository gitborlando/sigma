import { IRect } from '@gitborlando/geo'
import type { Matrix } from 'src/editor/geometry'

export type TRBL = 'top' | 'right' | 'bottom' | 'left'

export function snapGridRound(value: number, snapToGrid: boolean) {
  return snapToGrid ? Math.round(value) : value
}

export function snapGridRoundXY(xy: IXY, snapToGrid: boolean) {
  return XY.$(snapGridRound(xy.x, snapToGrid), snapGridRound(xy.y, snapToGrid))
}

export function snapGridRoundRect(rect: IRect, snapToGrid: boolean): IRect {
  const { x, y, width, height } = rect
  const snapStart = snapGridRoundXY(XY.$(x, y), snapToGrid)
  const snapEnd = snapGridRoundXY(XY.$(x + width, y + height), snapToGrid)
  return {
    ...snapStart,
    width: snapEnd.x - snapStart.x,
    height: snapEnd.y - snapStart.y,
  }
}

export const snapHalfPixel = (n: number) => {
  return Math.round(n - 0.5) + 0.5
}

export const snapSceneXYToHalfPixel = (
  xy: IXY,
  sceneMatrix: Matrix,
  axis: 'x' | 'y' | 'both' = 'both',
) => {
  const screenXY = sceneMatrix.applyXY(xy)
  return sceneMatrix.invertXY(
    XY.$(
      axis === 'x' || axis === 'both' ? snapHalfPixel(screenXY.x) : screenXY.x,
      axis === 'y' || axis === 'both' ? snapHalfPixel(screenXY.y) : screenXY.y,
    ),
  )
}

export function arrayLoopGet<T>(arr: T[], index: number) {
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
