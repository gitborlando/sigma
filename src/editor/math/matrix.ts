import { AABB } from 'src/editor/math/aabb'
import { Angle } from 'src/editor/math/angle'
import { max, min } from 'src/editor/math/base'
import { IXY } from 'src/editor/math/types'
import { XY } from 'src/editor/math/xy'

export type IMatrix = {
  a: number
  b: number
  c: number
  d: number
  tx: number
  ty: number
}

export type IMatrixTuple = [number, number, number, number, number, number]

export class Matrix {
  constructor(
    public a: number,
    public b: number,
    public c: number,
    public d: number,
    public tx: number,
    public ty: number,
  ) {}

  plain() {
    return {
      a: this.a,
      b: this.b,
      c: this.c,
      d: this.d,
      tx: this.tx,
      ty: this.ty,
    }
  }

  tuple() {
    return [this.a, this.b, this.c, this.d, this.tx, this.ty] as IMatrixTuple
  }

  clone() {
    return Matrix.of(this)
  }

  set = (label: keyof IMatrix, value: number) => {
    this[label] = value
    return this
  }

  shift = (delta: IXY) => {
    this.tx += delta.x
    this.ty += delta.y
    return this
  }

  translate = (x: number, y: number) => {
    this.tx += x
    this.ty += y
    return this
  }

  scale = (x: number, y: number) => {
    this.a *= x
    this.d *= y
    this.b *= x
    this.c *= y
    this.tx *= x
    this.ty *= y
    return this
  }

  rotate = (angle: number, origin = XY.$(0, 0)) => {
    const { cos, sin } = Angle.cosSin(angle)
    const { a, b, c, d, tx, ty } = this
    const dx = tx - origin.x
    const dy = ty - origin.y

    this.a = a * cos - b * sin
    this.b = a * sin + b * cos
    this.c = c * cos - d * sin
    this.d = c * sin + d * cos
    this.tx = dx * cos - dy * sin + origin.x
    this.ty = dx * sin + dy * cos + origin.y

    return this
  }

  append = (matrix: IMatrix) => {
    const { a, b, c, d, tx, ty } = this

    this.a = matrix.a * a + matrix.b * c
    this.b = matrix.a * b + matrix.b * d
    this.c = matrix.c * a + matrix.d * c
    this.d = matrix.c * b + matrix.d * d

    this.tx = matrix.tx * a + matrix.ty * c + tx
    this.ty = matrix.tx * b + matrix.ty * d + ty

    return this
  }

  prepend = (matrix: IMatrix) => {
    const { a, b, c, d, tx, ty } = this

    this.a = a * matrix.a + b * matrix.c
    this.b = a * matrix.b + b * matrix.d
    this.c = c * matrix.a + d * matrix.c
    this.d = c * matrix.b + d * matrix.d

    this.tx = tx * matrix.a + ty * matrix.c + matrix.tx
    this.ty = tx * matrix.b + ty * matrix.d + matrix.ty

    return this
  }

  divide = (matrix: IMatrix) => {
    this.append(Matrix.of(matrix).invert())
    return this
  }

  invert = () => {
    const { a, b, c, d, tx, ty } = this
    const invDet = 1 / (a * d - b * c)
    const tuple = [d, -b, -c, a, c * ty - d * tx, b * tx - a * ty].map(
      (i) => i * invDet,
    ) as IMatrixTuple
    return Matrix.from(tuple)
  }

  applyXY = (xy: IXY, isInvert?: 'invert') => {
    const { x, y } = xy
    if (isInvert) {
      const { a, b, c, d, tx, ty } = this
      const invDet = 1 / (a * d - b * c)
      const invA = d * invDet
      const invB = -b * invDet
      const invC = -c * invDet
      const invD = a * invDet
      const invTx = (c * ty - d * tx) * invDet
      const invTy = (b * tx - a * ty) * invDet
      return XY.$(invA * x + invC * y + invTx, invB * x + invD * y + invTy)
    }
    const { a, b, c, d, tx, ty } = this
    return XY.$(a * x + c * y + tx, b * x + d * y + ty)
  }

  applyAABB = (aabb: AABB, isInvert?: 'invert') => {
    const { minX, minY, maxX, maxY } = aabb
    const xy1 = this.applyXY(XY.$(minX, minY), isInvert)
    const xy2 = this.applyXY(XY.$(maxX, minY), isInvert)
    const xy3 = this.applyXY(XY.$(maxX, maxY), isInvert)
    const xy4 = this.applyXY(XY.$(minX, maxY), isInvert)
    return new AABB(
      min(xy1.x, xy2.x, xy3.x, xy4.x),
      min(xy1.y, xy2.y, xy3.y, xy4.y),
      max(xy1.x, xy2.x, xy3.x, xy4.x),
      max(xy1.y, xy2.y, xy3.y, xy4.y),
    )
  }

  invertXY = (xy: IXY) => {
    return this.applyXY(xy, 'invert')
  }

  invertAABB = (aabb: AABB) => {
    return this.applyAABB(aabb, 'invert')
  }

  static of(matrix: IMatrix) {
    return new Matrix(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty)
  }

  static from(matrix: IMatrixTuple) {
    return new Matrix(
      matrix[0],
      matrix[1],
      matrix[2],
      matrix[3],
      matrix[4],
      matrix[5],
    )
  }

  static identity() {
    return new Matrix(1, 0, 0, 1, 0, 0)
  }

  static isFlipped(matrix: IMatrix) {
    return matrix.a * matrix.d - matrix.b * matrix.c < 0
  }
}
