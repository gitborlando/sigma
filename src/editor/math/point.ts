import { firstOne, lastOne, optionalSet, range } from '@gitborlando/utils'
import { divide, max } from 'src/editor/math/base'

export type IPoint = {
  type: 'point'
  x: number
  y: number
  radius: number
  symmetric: 'angle' | 'complete' | 'none'
  handleLeft?: IXY
  handleRight?: IXY
  endPath?: boolean
  startPath?: boolean
}

export function point(option?: Partial<IPoint>): IPoint {
  return {
    type: 'point',
    symmetric: 'angle',
    x: 0,
    y: 0,
    radius: 0,
    ...option,
  }
}

export function createLine(start: IXY, length: number, rotation: number) {
  const end = XY._(start.x + length, start.y)
  const points = [point(start), point(end)]
  optionalSet(firstOne(points), 'startPath', true)
  optionalSet(lastOne(points), 'endPath', true)
  return points
}

export function createRegularPolygon(
  width: number,
  height: number,
  sideCount: number,
) {
  sideCount = Math.max(sideCount | 0, 3)
  const center = XY._(width / 2, height / 2)
  const radius = max(width, height) / 2
  const delta = 360 / sideCount
  const points = range(sideCount).map((i) => {
    const angle = i * delta - 90
    if (width > height) {
      const x = center.x + Angle.cos(angle) * radius
      const y = center.y + Angle.sin(angle) * radius * divide(height, width)
      return point({ x, y })
    } else {
      const x = center.x + Angle.cos(angle) * radius * divide(width, height)
      const y = center.y + Angle.sin(angle) * radius
      return point({ x, y })
    }
  })
  optionalSet(firstOne(points), 'startPath', true)
  optionalSet(lastOne(points), 'endPath', true)
  return points
}

export function createStarPolygon(
  width: number,
  height: number,
  pointCount: number,
  innerRate: number,
) {
  pointCount = max(pointCount | 0, 3)
  const center = XY._(width / 2, height / 2)
  const outerRadius = max(width, height) / 2
  const innerRadius = innerRate * outerRadius
  const delta = 360 / pointCount / 2
  const points = range(pointCount * 2).map((i) => {
    const radius = (-1) ** i === 1 ? outerRadius : innerRadius
    const angle = i * delta - 90
    if (width > height) {
      const x = center.x + Angle.cos(angle) * radius
      const y = center.y + Angle.sin(angle) * radius * (height / width)
      return point({ x, y })
    } else {
      const x = center.x + Angle.cos(angle) * radius * (width / height)
      const y = center.y + Angle.sin(angle) * radius
      return point({ x, y })
    }
  })
  optionalSet(firstOne(points), 'startPath', true)
  optionalSet(lastOne(points), 'endPath', true)
  return points
}
