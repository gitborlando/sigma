import { Angle } from 'src/editor/math/angle'
import { IXY } from 'src/editor/math/types'

export class XY {
  private static xy = { x: 0, y: 0 }

  static of(xy: IXY) {
    this.xy = xy
    return this
  }

  static from(xy: IXY) {
    this.xy = { x: xy.x, y: xy.y }
    return this
  }

  static plus(...others: IXY[]) {
    others.reduce((sum, cur) => sum + cur.x, this.xy.x)
    others.reduce((sum, cur) => sum + cur.y, this.xy.y)
    return this
  }

  static plusNum(num: number) {
    this.xy.x += num
    this.xy.y += num
    return this
  }

  static minus(...others: IXY[]) {
    others.reduce((sum, cur) => sum - cur.x, this.xy.x)
    others.reduce((sum, cur) => sum - cur.y, this.xy.y)
    return this
  }

  static multiply(...numbers: number[]) {
    const n = numbers.reduce((a, b) => a * b, 1)
    this.xy.x *= n
    this.xy.y *= n
    return this
  }

  static divide(...numbers: number[]) {
    const n = numbers.reduce((a, b) => a * b, 1)
    this.xy.x /= n
    this.xy.y /= n
    return this
  }

  static rotate(origin: IXY, rotation: number) {
    const cos = Angle.cos(rotation)
    const sin = Angle.sin(rotation)
    const dx = this.xy.x - origin.x
    const dy = this.xy.y - origin.y
    this.xy.x = dx * cos - dy * sin + origin.x
    this.xy.y = dx * sin + dy * cos + origin.y
    return this
  }

  static _(x: number = 0, y: number = 0) {
    return { x, y }
  }

  static symmetric(origin: IXY) {
    return {
      x: 2 * origin.x - this.xy.x,
      y: 2 * origin.y - this.xy.y,
    }
  }

  static lerp(another: IXY, t: number) {
    return {
      x: this.xy.x + (another.x - this.xy.x) * t,
      y: this.xy.y + (another.y - this.xy.y) * t,
    }
  }

  static dot(another: IXY) {
    return this.xy.x * another.x + this.xy.y * another.y
  }

  static distance(another: IXY) {
    return Math.hypot(this.xy.x - another.x, this.xy.y - another.y)
  }

  static tuple() {
    return [this.xy.x, this.xy.y] as const
  }

  static center(wh: { width: number; height: number }) {
    return { x: wh.width / 2, y: wh.height / 2 }
  }

  static leftTop(e: { left: number; top: number }) {
    return { x: e.left, y: e.top }
  }

  static client(e: { clientX: number; clientY: number }) {
    return { x: e.clientX, y: e.clientY }
  }

  static xAxis(rotation: number = 0) {
    return { x: Angle.cos(rotation), y: Angle.sin(rotation) }
  }

  static yAxis(rotation: number = 0) {
    return { x: -Angle.sin(rotation), y: Angle.cos(rotation) }
  }
}
