import { Angle } from 'src/editor/math/angle'
import { IXY } from 'src/editor/math/types'

export class XY {
  constructor(
    public x: number,
    public y: number,
  ) {}

  $() {
    return { x: this.x, y: this.y }
  }

  tuple() {
    return [this.x, this.y] as const
  }

  plus(...others: IXY[]) {
    this.x = others.reduce((sum, cur) => sum + cur.x, this.x)
    this.y = others.reduce((sum, cur) => sum + cur.y, this.y)
    return this
  }

  plusNum(num: number) {
    this.x += num
    this.y += num
    return this
  }

  minus(...others: IXY[]) {
    this.x = others.reduce((sum, cur) => sum - cur.x, this.x)
    this.y = others.reduce((sum, cur) => sum - cur.y, this.y)
    return this
  }

  multiply(...numbers: number[]) {
    const n = numbers.reduce((a, b) => a * b, 1)
    this.x *= n
    this.y *= n
    return this
  }

  multiplyNum(num: number) {
    this.x *= num
    this.y *= num
    return this
  }

  divide(...numbers: number[]) {
    const n = numbers.reduce((a, b) => a * b, 1)
    this.x /= n
    this.y /= n
    return this
  }

  rotate(origin: IXY, rotation: number) {
    const { cos, sin } = Angle.cosSin(rotation)
    const dx = this.x - origin.x
    const dy = this.y - origin.y
    this.x = dx * cos - dy * sin + origin.x
    this.y = dx * sin + dy * cos + origin.y
    return this
  }

  static $(x = 0, y = 0) {
    return { x, y }
  }

  static of(xy: IXY) {
    return new XY(xy.x, xy.y)
  }

  static from(x: number, y: number) {
    return new XY(x, y)
  }

  static center(wh: { width: number; height: number }) {
    return new XY(wh.width / 2, wh.height / 2)
  }

  static leftTop(e: { left: number; top: number }) {
    return new XY(e.left, e.top)
  }

  static client(e: { clientX: number; clientY: number }) {
    return new XY(e.clientX, e.clientY)
  }

  static xAxis(rotation: number = 0) {
    const { cos, sin } = Angle.cosSin(rotation)
    return new XY(cos, sin)
  }

  static yAxis(rotation: number = 0) {
    const { cos, sin } = Angle.cosSin(rotation)
    return new XY(-sin, cos)
  }

  static dot(self: IXY, another: IXY) {
    return self.x * another.x + self.y * another.y
  }

  static distance(self: IXY, another: IXY) {
    return Math.hypot(self.x - another.x, self.y - another.y)
  }

  static vector(self: IXY, another: IXY) {
    return new XY(self.x - another.x, self.y - another.y)
  }

  static symmetric(self: IXY, origin = XY.$()) {
    return new XY(2 * origin.x - self.x, 2 * origin.y - self.y)
  }

  static lerp(self: IXY, origin: IXY, t: number) {
    const distance = XY.distance(self, origin)
    return new XY(
      self.x + (self.x - origin.x) * (t / distance),
      self.y + (self.y - origin.y) * (t / distance),
    )
  }
}
