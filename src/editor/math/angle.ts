export const { PI, cos, sin, tan, acos, asin, atan, atan2 } = Math

export class Angle {
  static cos(angle: number) {
    return cos(Angle.radianFy(angle))
  }

  static sin(angle: number) {
    return sin(Angle.radianFy(angle))
  }

  static tan(angle: number) {
    return tan(Angle.radianFy(angle))
  }

  static acos(angle: number) {
    return Angle.angleFy(acos(Angle.radianFy(angle)))
  }

  static asin(angle: number) {
    return Angle.angleFy(asin(Angle.radianFy(angle)))
  }

  static atan(angle: number) {
    return Angle.angleFy(atan(Angle.radianFy(angle)))
  }

  static atan2(y: number, x: number) {
    return Angle.angleFy(atan2(y, x))
  }

  static angleFy(radians: number) {
    return radians * (180 / Math.PI)
  }

  static radianFy(angle: number) {
    return angle * (Math.PI / 180)
  }

  static normal(angle: number) {
    return (angle + 360) % 360
  }

  static snap(angle: number, step = 90) {
    return Angle.normal(Math.round(angle / step) * step)
  }

  static fromTwoVector(xy: IXY, origin: IXY) {
    return Angle.atan2(xy.y - origin.y, xy.x - origin.x)
  }

  static rotatePoint(ax: number, ay: number, ox: number, oy: number, angle: number) {
    const radian = Angle.radianFy(angle)
    return XY._(
      (ax - ox) * cos(radian) - (ay - oy) * sin(radian) + ox,
      (ax - ox) * sin(radian) + (ay - oy) * cos(radian) + oy,
    )
  }

  static sweep(a: IXY, b: IXY, clockwise = false) {
    const dot = a.x * b.x + a.y * b.y
    const det = a.x * b.y - a.y * b.x
    return Angle.normal(Angle.atan2(det, dot) * (clockwise ? 1 : -1))
  }

  static sweepFromXAxis(xy: IXY, clockwise = false) {
    return Angle.sweep(xy, XY.xAxis(), clockwise)
  }
}
