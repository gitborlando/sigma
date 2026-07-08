import { firstOne, lastOne, miniId, optionalSet } from '@gitborlando/utils'

export function point(option?: Partial<S.Point>): S.Point {
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

export function createRegularPolygon(
  width: number,
  height: number,
  sideCount: number,
) {
  sideCount = Math.max(sideCount | 0, 3)

  const points = Array.from({ length: sideCount }, (_, i) => {
    const radian = ((i * 360) / sideCount - 90) * (Math.PI / 180)
    return point({
      x: width / 2 + Math.cos(radian) * (width / 2),
      y: height / 2 + Math.sin(radian) * (height / 2),
    })
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
  pointCount = Math.max(pointCount | 0, 3)

  const points = Array.from({ length: pointCount * 2 }, (_, i) => {
    const rate = i % 2 === 0 ? 1 : innerRate
    const radian = ((i * 180) / pointCount - 90) * (Math.PI / 180)
    return point({
      x: width / 2 + Math.cos(radian) * (width / 2) * rate,
      y: height / 2 + Math.sin(radian) * (height / 2) * rate,
    })
  })
  optionalSet(firstOne(points), 'isStart', true)
  optionalSet(lastOne(points), 'isEnd', true)
  return points
}

export function createLine(start: IXY, length: number) {
  const end = XY.$(start.x + length, start.y)
  const points = [point(start), point(end)]
  optionalSet(firstOne(points), 'isStart', true)
  optionalSet(lastOne(points), 'isEnd', true)
  return points
}
