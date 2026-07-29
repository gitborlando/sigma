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

export const snapSceneXYToHalfPixel = (
  xy: IXY,
  sceneMatrix: Matrix,
  axis: 'x' | 'y' | 'both' = 'both',
) => {
  const screenXY = sceneMatrix.applyXY(xy)
  const snapHalfPixel = (n: number) => Math.round(n - 0.5) + 0.5
  return sceneMatrix.invertXY(
    XY.$(
      axis === 'x' || axis === 'both' ? snapHalfPixel(screenXY.x) : screenXY.x,
      axis === 'y' || axis === 'both' ? snapHalfPixel(screenXY.y) : screenXY.y,
    ),
  )
}
