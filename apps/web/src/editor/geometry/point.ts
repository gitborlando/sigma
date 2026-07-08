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

export function createLine(start: IXY, length: number) {
  const end = XY.$(start.x + length, start.y)
  const points = [point(start), point(end)]
  optionalSet(firstOne(points), 'isStart', true)
  optionalSet(lastOne(points), 'isEnd', true)
  return points
}
