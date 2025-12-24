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
  private _vertexes?: IXY[]
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
    this._matrix = matrix
    this.expired()
  }

  get xy() {
    if (this._xy === undefined) {
      this._xy = Matrix.of(this._matrix).xy(XY.$(0, 0))
    }
    return this._xy
  }

  set xy(target: IXY) {
    const current = this.xy
    const delta = XY.of(target).minus(current)
    Matrix.of(this._matrix).translate(delta.x, delta.y)
    this.expired()
  }

  get rotation() {
    if (this._rotation === undefined) {
      const transformedXY = Matrix.of(this._matrix).xy(XY.xAxis())
      this._rotation = Angle.sweep(transformedXY, XY.xAxis())
    }
    return this._rotation
  }

  set rotation(rad: number) {
    const current = this.rotation
    const delta = rad - current
    Matrix.of(this._matrix).rotate(delta)
    this.expired()
  }

  get center() {
    if (this._center === undefined) {
      this._center = Matrix.of(this._matrix).xy(
        XY.$(this._width / 2, this._height / 2),
      )
    }
    return this._center
  }

  get vertexes() {
    if (this._vertexes === undefined) {
      this._vertexes = this.calcVertexes()
    }
    return this._vertexes
  }

  get aabb() {
    if (this._aabb === undefined) {
      this._aabb = this.calcAABB()
    }
    return this._aabb
  }

  private calcVertexes() {
    const matrix = Matrix.of(this._matrix)
    return [
      matrix.xy(XY.$(0, 0)),
      matrix.xy(XY.$(this._width, 0)),
      matrix.xy(XY.$(this._width, this._height)),
      matrix.xy(XY.$(0, this._height)),
    ]
  }

  private calcAABB() {
    const [TL, TR, BR, BL] = this.vertexes
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
    this._vertexes = undefined
    this._aabb = undefined
  }

  shift(delta: IXY) {
    Matrix.of(this._matrix).translate(delta.x, delta.y)
    this.expired()
    return this
  }

  scale(scale: IXY) {
    Matrix.of(this._matrix).scale(scale.x, scale.y)
    this.expired()
    return this
  }

  rotate(delta: number) {
    Matrix.of(this._matrix).rotate(delta)
    this.expired()
    return this
  }

  update(width: number, height: number, matrix: IMatrix) {
    this._width = width
    this._height = height
    this._matrix = matrix
    this.expired()
    return this
  }

  from(mrect: IMRect) {
    this._width = mrect.width
    this._height = mrect.height
    this._matrix = Matrix.clone(mrect.matrix)
    this.expired()
    return this
  }

  static identity() {
    return new MRect(0, 0, Matrix.identity())
  }
}
