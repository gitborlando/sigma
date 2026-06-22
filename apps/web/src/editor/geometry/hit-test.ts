import { Angle, type IXY, XY } from '@gitborlando/geo'
import { loopFor } from '@gitborlando/utils'

export class HitTest {
  static hitRoundRect(w: number, h: number, r: number) {
    return (xy: IXY) => {
      const inRect = xy.x >= 0 && xy.x <= w && xy.y >= 0 && xy.y <= h
      if (r === 0) return inRect
      if (!inRect) return false
      if (XY.distance(xy, XY.$(r, r)) > r && xy.x < r && xy.y < r) return false
      if (XY.distance(xy, XY.$(w - r, r)) > r && xy.x > w - r && xy.y < r)
        return false
      if (XY.distance(xy, XY.$(w - r, h - r)) > r && xy.x > w - r && xy.y > h - r)
        return false
      if (XY.distance(xy, XY.$(r, h - r)) > r && xy.x < r && xy.y > h - r)
        return false
      return true
    }
  }

  static hitPolygon(xys: IXY[]) {
    return (xy: IXY) => this.inPolygon(xys, xy)
  }

  static hitPolyline(xys: IXY[], spread: number) {
    const polygons: IXY[][] = []
    loopFor(xys, (cur, next) => {
      polygons.push(this.twoPointsSpreadRect(cur, next, spread))
    })
    return (xy: IXY) => {
      for (let i = 0; i < polygons.length; i++) {
        if (this.inPolygon(polygons[i], xy)) return true
      }
      return false
    }
  }

  static hitEllipse(
    cx: number,
    cy: number,
    a: number,
    b: number,
    startAngle: number,
    endAngle: number,
    innerRate: number,
  ) {
    return (xy: IXY) => {
      const dx = xy.x - cx
      const dy = xy.y - cy

      const hit = (a: number, b: number) =>
        (dx * dx * a * b) / (a * a) + (dy * dy * a * b) / (b * b) <= a * b

      const hitOuter = hit(a, b)
      if (!hitOuter) return false

      if (innerRate) {
        const hitInner = hit(a * innerRate, b * innerRate)
        if (hitInner) return false
      }

      startAngle = Angle.normal(startAngle)
      endAngle = Angle.normal(endAngle)

      if (startAngle === 0 && endAngle === 0) return true

      const angle = Angle.sweep(XY.vector(xy, XY.$(cx, cy)))

      if (startAngle <= endAngle) return angle >= startAngle && angle <= endAngle
      return angle >= startAngle || angle <= endAngle
    }
  }

  static hitPoint(center: IXY, size: number) {
    return (xy: IXY) =>
      HitTest.hitEllipse(center.x, center.y, size / 2, size / 2, 0, 360, 0)(xy)
  }

  private static inPolygon(xys: IXY[], xy: IXY) {
    let inside = false
    loopFor(xys, (cur, next) => {
      if (cur.y > xy.y && next.y > xy.y) return
      if (cur.y < xy.y && next.y < xy.y) return
      const small = cur.y < next.y ? cur : next
      const large = cur.y > next.y ? cur : next
      const A = XY.of(large).minus(small)
      const B = XY.of(xy).minus(small)
      if (A.x * B.y - A.y * B.x > 0) inside = !inside
    })
    return inside
  }

  private static twoPointsSpreadRect(p1: IXY, p2: IXY, spread: number) {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const radian = Math.atan2(dy, dx)
    const xShift = spread * Math.sin(radian)
    const yShift = spread * Math.cos(radian)
    const TL = XY.$(p1.x - xShift, p1.y + yShift)
    const TR = XY.$(p2.x - xShift, p2.y + yShift)
    const BR = XY.$(p2.x + xShift, p2.y - yShift)
    const BL = XY.$(p1.x + xShift, p1.y - yShift)
    return [TL, TR, BR, BL]
  }
}
