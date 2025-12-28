import { AABB } from 'src/editor/math/aabb'
import { Angle } from 'src/editor/math/angle'
import { IMatrix, Matrix } from 'src/editor/math/matrix'
import { IXY } from 'src/editor/math/types'
import { XY } from 'src/editor/math/xy'

export type IMRect = {
  width: number
  height: number
  matrix: IMatrix
}

/**
 * MRect: Matrix Rect
 */
export class MRect {
  private _width: number
  private _height: number
  private _matrix: IMatrix

  private _xy?: IXY
  private _rotation?: number
  private _center?: IXY
  private _vertices?: IXY[]
  private _aabb?: AABB

  constructor(width: number, height: number, matrix: IMatrix) {
    this._width = width
    this._height = height
    this._matrix = matrix
  }

  get width() {
    return this._width
  }

  set width(width: number) {
    if (this._width === width) return
    this._width = width
    this.expired()
  }

  get height() {
    return this._height
  }

  set height(height: number) {
    if (this._height === height) return
    this._height = height
    this.expired()
  }

  get matrix() {
    return this._matrix
  }

  set matrix(matrix: IMatrix) {
    this._matrix = Matrix.of(matrix).plain()
    this.expired()
  }

  get x() {
    if (this._xy === undefined) {
      this._xy = Matrix.of(this.matrix).applyXY(XY.$(0, 0))
    }
    return this._xy.x
  }

  get y() {
    if (this._xy === undefined) {
      this._xy = Matrix.of(this.matrix).applyXY(XY.$(0, 0))
    }
    return this._xy.y
  }

  set x(x: number) {
    const delta = x - this.x
    this.matrix = Matrix.of(this.matrix).translate(delta, 0).plain()
    this.expired()
  }

  set y(y: number) {
    const delta = y - this.y
    this.matrix = Matrix.of(this.matrix).translate(0, delta).plain()
    this.expired()
  }

  get rotation() {
    if (this._rotation === undefined) {
      this._rotation = this.calcRotation()
    }
    return this._rotation
  }

  set rotation(rotation: number) {
    const delta = rotation - this.rotation
    this.matrix = Matrix.of(this.matrix).rotate(delta, this.center).plain()
    this.expired()
  }

  get center() {
    if (this._center === undefined) {
      this._center = this.calcCenter()
    }
    return this._center
  }

  get vertices() {
    if (this._vertices === undefined) {
      this._vertices = this.calcVertices()
    }
    return this._vertices
  }

  get aabb() {
    if (this._aabb === undefined) {
      this._aabb = this.calcAABB()
    }
    return this._aabb
  }

  private calcRotation() {
    const { a, b, c, d } = this.matrix
    const transformedXY = Matrix.of({ a, b, c, d, tx: 0, ty: 0 }).applyXY(XY.xAxis())
    return Angle.sweep(transformedXY, XY.xAxis())
  }

  private calcCenter() {
    return Matrix.of(this.matrix).applyXY(XY.$(this._width / 2, this._height / 2))
  }

  private calcVertices() {
    const matrix = Matrix.of(this.matrix)
    return [
      matrix.applyXY(XY.$(0, 0)),
      matrix.applyXY(XY.$(this._width, 0)),
      matrix.applyXY(XY.$(this._width, this._height)),
      matrix.applyXY(XY.$(0, this._height)),
    ]
  }

  private calcAABB() {
    const [TL, TR, BR, BL] = this.vertices
    return new AABB(
      Math.min(TL.x, TR.x, BR.x, BL.x),
      Math.min(TL.y, TR.y, BR.y, BL.y),
      Math.max(TL.x, TR.x, BR.x, BL.x),
      Math.max(TL.y, TR.y, BR.y, BL.y),
    )
  }

  private expired() {
    this._xy = undefined
    this._rotation = undefined
    this._center = undefined
    this._vertices = undefined
    this._aabb = undefined
  }

  shift(delta: IXY) {
    this.matrix = Matrix.of(this.matrix).translate(delta.x, delta.y).plain()
    this.expired()
    return this
  }

  rotate(delta: number) {
    this.matrix = Matrix.of(this.matrix).rotate(delta, this.center).plain()
    this.expired()
    return this
  }

  transform(matrix: IMatrix) {
    this.matrix = Matrix.of(this.matrix).prepend(matrix).plain()
    this.expired()
    const [p0, p1, p2] = this.vertices
    const newWidth = XY.distance(p0, p1)
    const newHeight = XY.distance(p1, p2)
    const scaleX = newWidth / this.width
    const scaleY = newHeight / this.height
    const scaleMatrix = Matrix.identity().scale(scaleX, scaleY).invert()
    const newMatrix = Matrix.of(this.matrix).append(scaleMatrix).plain()
    this.width = newWidth
    this.height = newHeight
    this.matrix = newMatrix
    return this
  }

  from(mrect: IMRect) {
    this._width = mrect.width
    this._height = mrect.height
    this.matrix = Matrix.of(mrect.matrix).plain()
    this.expired()
    return this
  }

  plain() {
    return {
      width: this.width,
      height: this.height,
      matrix: Matrix.of(this.matrix).plain(),
    }
  }

  static identity(width = 0, height = 0) {
    return new MRect(width, height, Matrix.identity().plain())
  }

  static of(mrect: IMRect) {
    return new MRect(mrect.width, mrect.height, Matrix.of(mrect.matrix).plain())
  }
}
