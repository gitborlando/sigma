import { firstOne } from '@gitborlando/utils'
import { IRectWithCenter } from 'src/editor/math/types'
import { OBB } from './obb'
import { XY } from './xy'

export class AABB {
  constructor(
    public minX: number,
    public minY: number,
    public maxX: number,
    public maxY: number,
  ) {}

  static rect(aabb: AABB): IRectWithCenter {
    return {
      x: aabb.minX,
      y: aabb.minY,
      width: aabb.maxX - aabb.minX,
      height: aabb.maxY - aabb.minY,
      centerX: aabb.minX + (aabb.maxX - aabb.minX) / 2,
      centerY: aabb.minY + (aabb.maxY - aabb.minY) / 2,
    }
  }

  static rectTuple(aabb: AABB) {
    return [
      aabb.minX,
      aabb.minY,
      aabb.maxX - aabb.minX,
      aabb.maxY - aabb.minY,
    ] as const
  }

  static collide(one: AABB, another: AABB): boolean {
    return (
      one.minX <= another.maxX &&
      one.maxX >= another.minX &&
      one.minY <= another.maxY &&
      one.maxY >= another.minY
    )
  }

  static include(one: AABB, another: AABB) {
    let result = 1
    let [large, small] = [one, another]
    if (one.maxX - one.minX < another.maxX - another.minX) {
      result = 0
      large = another
      small = one
    }
    const included =
      large.minX <= small.minX &&
      large.maxX >= small.maxX &&
      large.minY <= small.minY &&
      large.maxY >= small.maxY
    return included ? result : -1
  }

  static extend(
    aabb: AABB,
    ...expands: [number] | [number, number, number, number]
  ): AABB {
    const { minX, minY, maxX, maxY } = aabb
    if (expands.length === 1) {
      const expand = expands[0]
      return new AABB(minX - expand, minY - expand, maxX + expand, maxY + expand)
    } else {
      return new AABB(
        minX - expands[0],
        minY - expands[1],
        maxX + expands[2],
        maxY + expands[3],
      )
    }
  }

  static merge(aabbList: AABB[] | Set<AABB>) {
    if (!firstOne(aabbList)) return new AABB(0, 0, 0, 0)

    let xMin = Infinity,
      yMin = Infinity,
      xMax = -Infinity,
      yMax = -Infinity
    for (const aabb of aabbList) {
      xMin = min(xMin, aabb.minX)
      yMin = min(yMin, aabb.minY)
      xMax = max(xMax, aabb.maxX)
      yMax = max(yMax, aabb.maxY)
    }
    return new AABB(xMin, yMin, xMax, yMax)
  }

  static fromOBB(obb: OBB) {
    const width = obb.projectionLengthAt(XY._(1, 0))
    const height = obb.projectionLengthAt(XY._(0, 1))
    return new AABB(
      obb.center.x - width / 2,
      obb.center.y - height / 2,
      obb.center.x + width / 2,
      obb.center.y + height / 2,
    )
  }

  static updateFromOBB(aabb: AABB, obb: OBB) {
    const width = obb.projectionLengthAt(XY._(1, 0))
    const height = obb.projectionLengthAt(XY._(0, 1))
    aabb.minX = obb.center.x - width / 2
    aabb.minY = obb.center.y - height / 2
    aabb.maxX = obb.center.x + width / 2
    aabb.maxY = obb.center.y + height / 2
    return aabb
  }
}
