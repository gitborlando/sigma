import { AABB, IRect } from '@gitborlando/geo'
import { IMatrix, Matrix } from 'src/editor/geometry/matrix'

export interface IMRect {
  width: number
  height: number
  matrix: IMatrix
  aspectRatio: number
}

/**
 * MRect: Matrix Rect
 */
export class MRect {
  private _width: number
  private _height: number
  private _matrix: IMatrix
  private _aspectRatio: number

  private _xy?: IXY
  private _rotation?: number
  private _center?: IXY
  private _vertices?: IXY[]
  private _aabb?: AABB

  constructor(
    width: number,
    height: number,
    matrix: IMatrix,
    aspectRatio: number = -1,
  ) {
    this._width = width
    this._height = height
    this._matrix = matrix
    this._aspectRatio = aspectRatio
  }

  get width() {
    return this._width
  }

  set width(width: number) {
    if (this._width === width) return
    this._width = width
    if (this._aspectRatio > 0) this._height = width / this._aspectRatio
    this.expired()
  }

  get height() {
    return this._height
  }

  set height(height: number) {
    if (this._height === height) return
    this._height = height
    if (this._aspectRatio > 0) this._width = height * this._aspectRatio
    this.expired()
  }

  get aspectRatio() {
    return this._aspectRatio
  }

  set aspectRatio(aspectRatio: number) {
    this._aspectRatio = aspectRatio
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
    return this._vertices || (this._vertices = this._calcVertices(this.matrix))
  }

  get aabb() {
    return this._aabb || (this._aabb = this._calcAABB(this.vertices))
  }

  private calcRotation() {
    const { a, b, c, d } = this.matrix
    const transformedXY = Matrix.of({ a, b, c, d, tx: 0, ty: 0 }).applyXY(XY.xAxis())
    return Angle.sweep(transformedXY, XY.xAxis())
  }

  private calcCenter() {
    return Matrix.of(this.matrix).applyXY(XY.$(this._width / 2, this._height / 2))
  }

  private _calcVertices(_matrix: IMatrix) {
    const matrix = Matrix.of(_matrix)
    return [
      matrix.applyXY(XY.$(0, 0)),
      matrix.applyXY(XY.$(this._width, 0)),
      matrix.applyXY(XY.$(this._width, this._height)),
      matrix.applyXY(XY.$(0, this._height)),
    ]
  }

  private _calcAABB(vertices: IXY[]) {
    const [TL, TR, BR, BL] = vertices
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

  transform(matrix: IMatrix, local?: boolean) {
    this.matrix = Matrix.of(this.matrix)
      [local ? 'append' : 'prepend'](matrix)
      .plain()
    this.expired()
    const [p0, p1, p2] = this.vertices
    const newWidth = XY.distance(p0, p1)
    const newHeight = XY.distance(p1, p2)
    const scaleX = newWidth / this.width
    const scaleY = newHeight / this.height
    const scaleMatrix = Matrix.identity().scale(scaleX, scaleY)
    const newMatrix = Matrix.of(this.matrix).divide(scaleMatrix).plain()
    this._width = newWidth
    this._height = newHeight
    this.matrix = newMatrix
    return this
  }

  lockAspectRatio(lock = true) {
    if (!lock || this.width <= 0 || this.height <= 0) {
      return (this.aspectRatio = -1)
    }
    this.aspectRatio = this.width / this.height
  }

  clone(mrect?: IMRect) {
    if (!mrect) return MRect.of(this)

    this._width = mrect.width
    this._height = mrect.height
    this._aspectRatio = mrect.aspectRatio
    this.matrix = Matrix.plain(mrect.matrix)
    return this
  }

  plain() {
    const { width, height, aspectRatio } = this
    const matrix = Matrix.plain(this.matrix)
    return { width, height, matrix, aspectRatio }
  }

  calcVertices(matrix: IMatrix) {
    return this._calcVertices(matrix)
  }

  calcAABB(vertices: IXY[]) {
    return this._calcAABB(vertices)
  }

  static identity(width = 0, height = 0) {
    return new MRect(width, height, Matrix.identity().plain())
  }

  static of(mrect: IMRect) {
    const { width, height, aspectRatio } = mrect
    const matrix = Matrix.plain(mrect.matrix)
    return new MRect(width, height, matrix, aspectRatio)
  }

  static fromRect(rect: IRect, matrix: IMatrix) {
    const { width, height } = rect
    return new MRect(width, height, Matrix.plain(matrix))
  }
}
