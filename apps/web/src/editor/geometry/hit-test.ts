import { Angle, type IXY, XY } from '@gitborlando/geo'
import { loopFor } from '@gitborlando/utils'
import { clamp } from 'es-toolkit'

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
    for (let i = 0; i < xys.length - 1; i++) {
      polygons.push(this.twoPointsSpreadRect(xys[i], xys[i + 1], spread))
    }
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
    sweepAngle: number,
    innerRate: number,
  ) {
    sweepAngle = clamp(sweepAngle, -360, 360)
    innerRate = clamp(innerRate, 0, 1)
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

      if (Math.abs(sweepAngle) === 360) return true
      if (sweepAngle === 0) return false

      const angle = Angle.sweep(XY.vector(xy, XY.$(cx, cy)))
      const normalizedStart = Angle.normal(startAngle)

      return sweepAngle > 0
        ? Angle.normal(angle - normalizedStart) <= sweepAngle
        : Angle.normal(normalizedStart - angle) <= -sweepAngle
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
