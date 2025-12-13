import { Angle } from 'src/editor/math/angle'
import { IXY } from 'src/editor/math/types'

export class XY {
  static _xy = { x: 0, y: 0 }

  static get xy() {
    return this._xy
  }

  static of(xy: IXY) {
    this._xy = xy
    return this
  }

  static from(xy: IXY) {
    this._xy = { x: xy.x, y: xy.y }
    return this
  }

  static plus(...others: IXY[]) {
    this._xy.x = others.reduce((sum, cur) => sum + cur.x, this._xy.x)
    this._xy.y = others.reduce((sum, cur) => sum + cur.y, this._xy.y)
    return this
  }

  static plusNum(num: number) {
    this._xy.x += num
    this._xy.y += num
    return this
  }

  static minus(...others: IXY[]) {
    this._xy.x = others.reduce((sum, cur) => sum - cur.x, this._xy.x)
    this._xy.y = others.reduce((sum, cur) => sum - cur.y, this._xy.y)
    return this
  }

  static multiply(...numbers: number[]) {
    const n = numbers.reduce((a, b) => a * b, 1)
    this._xy.x *= n
    this._xy.y *= n
    return this
  }

  static multiplyNum(num: number) {
    this._xy.x *= num
    this._xy.y *= num
    return this
  }

  static divide(...numbers: number[]) {
    const n = numbers.reduce((a, b) => a * b, 1)
    this._xy.x /= n
    this._xy.y /= n
    return this
  }

  static rotate(origin: IXY, rotation: number) {
    const cos = Angle.cos(rotation)
    const sin = Angle.sin(rotation)
    const dx = this._xy.x - origin.x
    const dy = this._xy.y - origin.y
    this._xy.x = dx * cos - dy * sin + origin.x
    this._xy.y = dx * sin + dy * cos + origin.y
    return this
  }

  static _(x: number = 0, y: number = 0) {
    return { x, y }
  }

  static symmetric(origin = this._()) {
    return {
      x: 2 * origin.x - this._xy.x,
      y: 2 * origin.y - this._xy.y,
    }
  }

  static lerp(another: IXY, t: number) {
    const distance = this.distance(another)
    return {
      x: this._xy.x + (this._xy.x - another.x) * (t / distance),
      y: this._xy.y + (this._xy.y - another.y) * (t / distance),
    }
  }

  static dot(another: IXY) {
    return this._xy.x * another.x + this._xy.y * another.y
  }

  static distance(another: IXY) {
    return Math.hypot(this._xy.x - another.x, this._xy.y - another.y)
  }

  static vector(another: IXY) {
    return { x: this._xy.x - another.x, y: this._xy.y - another.y }
  }

  static tuple() {
    return [this._xy.x, this._xy.y] as const
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
