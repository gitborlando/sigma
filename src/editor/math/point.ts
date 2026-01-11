import { firstOne, lastOne, miniId, optionalSet, range } from '@gitborlando/utils'
import { max } from 'src/editor/math/base'

export function point(option?: Partial<V1.Point>): V1.Point {
  return {
    id: miniId(5),
    type: 'point',
    symmetric: 'angle',
    x: 0,
    y: 0,
    radius: 0,
    ...option,
  }
}

export function createLine(start: IXY, length: number) {
  const end = XY.$(start.x + length, start.y)
  const points = [point(start), point(end)]
  optionalSet(firstOne(points), 'isStart', true)
  optionalSet(lastOne(points), 'isEnd', true)
  return points
}

export function createRegularPolygon(
  width: number,
  height: number,
  sideCount: number,
) {
  sideCount = Math.max(sideCount | 0, 3)
  const center = XY.$(width / 2, width / 2)
  const radius = width / 2
  const delta = 360 / sideCount
  const matrix = Matrix.identity().scale(1, height / width)
  const points = range(sideCount).map((i) => {
    const angle = i * delta - 90
    const { cos, sin } = Angle.cosSin(angle)
    const x = center.x + cos * radius
    const y = center.y + sin * radius
    const xy = matrix.applyXY(XY.$(x, y))
    return point(xy)
  })
  optionalSet(firstOne(points), 'isStart', true)
  optionalSet(lastOne(points), 'isEnd', true)
  return points
}

export function createStarPolygon(
  width: number,
  height: number,
  pointCount: number,
  innerRate: number,
) {
  pointCount = max(pointCount | 0, 3)
  const center = XY.$(width / 2, height / 2)
  const outerRadius = max(width, height) / 2
  const innerRadius = innerRate * outerRadius
  const delta = 360 / pointCount / 2
  const points = range(pointCount * 2).map((i) => {
    const radius = (-1) ** i === 1 ? outerRadius : innerRadius
    const angle = i * delta - 90
    const { cos, sin } = Angle.cosSin(angle)
    if (width > height) {
      const x = center.x + cos * radius
      const y = center.y + sin * radius * (height / width)
      return point({ x, y })
    } else {
      const x = center.x + cos * radius * (width / height)
      const y = center.y + sin * radius
      return point({ x, y })
    }
  })
  optionalSet(firstOne(points), 'isStart', true)
  optionalSet(lastOne(points), 'isEnd', true)
  return points
}
