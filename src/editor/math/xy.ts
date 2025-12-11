import { cos, sin } from 'src/editor/math/angle'
import { sqrt } from 'src/editor/math/base'

export function xy_client(e: any) {
  return { x: e.clientX, y: e.clientY }
}

export function xy_from(xy: IXY) {
  return { x: xy.x, y: xy.y }
}

export function xy_center(xy: { centerX: number; centerY: number }) {
  return { x: xy.centerX, y: xy.centerY }
}

export function xy_mutate(self: IXY, another: IXY) {
  self.x = another.x
  self.y = another.y
}

export function xy_plus(self: IXY, another: IXY) {
  return { x: self.x + another.x, y: self.y + another.y }
}
export function xy_plus_mutate(self: IXY, another: IXY) {
  self.x = self.x + another.x
  self.y = self.y + another.y
}
export function xy_plus_all(...xys: IXY[]) {
  return xys.reduce((a, b) => xy_plus(a, b))
}

export function xy_minus(self: IXY, another: IXY) {
  return { x: self.x - another.x, y: self.y - another.y }
}
export function xy_minus_mutate(self: IXY, another: IXY) {
  self.x = self.x - another.x
  self.y = self.y - another.y
}

export function xy_multiply(self: IXY, ...numbers: number[]) {
  const n = numbers.reduce((a, b) => a * b, 1)
  return { x: self.x * n, y: self.y * n }
}
export function xy_multiply_mutate(self: IXY, ...numbers: number[]) {
  const n = numbers.reduce((a, b) => a * b, 1)
  self.x = self.x * n
  self.y = self.y * n
}

export function xy_divide(self: IXY, ...numbers: number[]) {
  const n = numbers.reduce((a, b) => a * b, 1)
  return { x: self.x / n, y: self.y / n }
}

export function xy_distance(self: IXY, another: IXY = XY._(0, 0)) {
  return Math.sqrt((self.x - another.x) ** 2 + (self.y - another.y) ** 2)
}

export function xy_rotate(self: IXY, origin: IXY, rotation: number) {
  if (rotation === 0) return self
  const radian = Angle.radianFy(rotation)
  const dx = self.x - origin.x
  const dy = self.y - origin.y
  return XY._(
    dx * cos(radian) - dy * sin(radian) + origin.x,
    dx * sin(radian) + dy * cos(radian) + origin.y,
  )
}

export function xy_dot(self: IXY, another: IXY) {
  return self.x * another.x + self.y * another.y
}

export function xy_symmetric(self: IXY, origin: IXY) {
  return { x: 2 * origin.x - self.x, y: 2 * origin.y - self.y }
}

export function xy_opposite(self: IXY) {
  return { x: -self.x, y: -self.y }
}

export function xy_toArray(self: IXY) {
  return [self.x, self.y] as [number, number]
}

export function xy_xAxis(rotation: number) {
  return { x: Angle.cos(rotation), y: Angle.sin(rotation) }
}

export function xy_yAxis(rotation: number) {
  return { x: -Angle.sin(rotation), y: Angle.cos(rotation) }
}

export class XY {
  constructor(
    public x: number,
    public y: number,
  ) {}
  plain() {
    return { x: this.x, y: this.y }
  }

  tuple() {
    return [this.x, this.y] as const
  }

  plus(...others: IXY[]) {
    const x = others.reduce((sum, cur) => sum + cur.x, this.x)
    const y = others.reduce((sum, cur) => sum + cur.y, this.y)
    return XY.of(x, y)
  }

  minus(...others: IXY[]) {
    const x = others.reduce((sum, cur) => sum - cur.x, this.x)
    const y = others.reduce((sum, cur) => sum - cur.y, this.y)
    return XY.of(x, y)
  }

  multiply(...numbers: number[]) {
    const n = numbers.reduce((a, b) => a * b, 1)
    return XY.of(this.x * n, this.y * n)
  }

  divide(...numbers: number[]) {
    const n = numbers.reduce((a, b) => a * b, 1)
    return XY.of(this.x / n, this.y / n)
  }

  rotate(origin: IXY, rotation: number) {
    if (rotation === 0) return XY.from(this)
    const cos = Angle.cos(rotation)
    const sin = Angle.sin(rotation)
    const dx = this.x - origin.x
    const dy = this.y - origin.y
    return XY.of(dx * cos - dy * sin + origin.x, dx * sin + dy * cos + origin.y)
  }

  symmetric(origin: IXY) {
    return XY.of(2 * origin.x - this.x, 2 * origin.y - this.y)
  }

  lerp(another: IXY, t: number) {
    const x = this.x + (another.x - this.x) * t
    const y = this.y + (another.y - this.y) * t
    return XY.of(x, y)
  }

  getDot(another: IXY) {
    return this.x * another.x + this.y * another.y
  }

  getDistance(another: IXY) {
    return sqrt((this.x - another.x) ** 2 + (this.y - another.y) ** 2)
  }

  static _(x: number = 0, y: number = 0) {
    return { x, y }
  }

  static of(x: number, y: number) {
    return new XY(x, y)
  }

  static from(xy: IXY) {
    if (xy instanceof XY) return xy
    return XY.of(xy.x, xy.y)
  }

  static center(xy: { centerX: number; centerY: number }) {
    return XY.of(xy.centerX, xy.centerY)
  }

  static leftTop(e: { left: number; top: number }) {
    return XY.of(e.left, e.top)
  }

  static client(e: { clientX: number; clientY: number }) {
    return XY.of(e.clientX, e.clientY)
  }

  static tuple(arr: [number, number]) {
    return XY.of(arr[0], arr[1])
  }

  static xAxis(rotation: number = 0) {
    return XY.of(Angle.cos(rotation), Angle.sin(rotation))
  }

  static yAxis(rotation: number = 0) {
    return XY.of(-Angle.sin(rotation), Angle.cos(rotation))
  }

  static distanceOf(a: IXY, b: IXY) {
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  static vectorOf(a: IXY, b: IXY) {
    return XY.of(a.x - b.x, a.y - b.y)
  }

  static lerpOf(a: IXY, b: IXY, t: number) {
    return XY.of(a.x + (a.x - b.x) * t, a.y + (a.y - b.y) * t)
  }
}
