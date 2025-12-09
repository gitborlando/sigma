import { AABB } from 'src/editor/math/aabb'

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
  tuple = () => {
    return [this.a, this.b, this.c, this.d, this.tx, this.ty] as IMatrixTuple
  }

  clone = () => {
    return new Matrix(...this.tuple())
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
    this.c *= x
    this.b *= y
    this.tx *= x
    this.ty *= y
    return this
  }

  rotate = (angle: number) => {
    const cos = Angle.cos(angle)
    const sin = Angle.sin(angle)

    const a1 = this.a
    const c1 = this.c
    const tx1 = this.tx

    this.a = a1 * cos - this.b * sin
    this.b = a1 * sin + this.b * cos
    this.c = c1 * cos - this.d * sin
    this.d = c1 * sin + this.d * cos
    this.tx = tx1 * cos - this.ty * sin
    this.ty = tx1 * sin + this.ty * cos

    return this
  }

  append = (matrix: Matrix) => {
    const a1 = this.a
    const b1 = this.b
    const c1 = this.c
    const d1 = this.d

    this.a = matrix.a * a1 + matrix.b * c1
    this.b = matrix.a * b1 + matrix.b * d1
    this.c = matrix.c * a1 + matrix.d * c1
    this.d = matrix.c * b1 + matrix.d * d1

    this.tx = matrix.tx * a1 + matrix.ty * c1 + this.tx
    this.ty = matrix.tx * b1 + matrix.ty * d1 + this.ty

    return this
  }

  prepend = (matrix: Matrix) => {
    const tx1 = this.tx

    if (matrix.a !== 1 || matrix.b !== 0 || matrix.c !== 0 || matrix.d !== 1) {
      const a1 = this.a
      const c1 = this.c

      this.a = a1 * matrix.a + this.b * matrix.c
      this.b = a1 * matrix.b + this.b * matrix.d
      this.c = c1 * matrix.a + this.d * matrix.c
      this.d = c1 * matrix.b + this.d * matrix.d
    }

    this.tx = tx1 * matrix.a + this.ty * matrix.c + matrix.tx
    this.ty = tx1 * matrix.b + this.ty * matrix.d + matrix.ty

    return this
  }

  invert = () => {
    const { a, b, c, d, tx, ty } = this
    const invDet = 1 / (a * d - b * c)
    const tuple = [d, -b, -c, a, c * ty - d * tx, b * tx - a * ty].map(
      (i) => i * invDet,
    ) as IMatrixTuple
    return Matrix.of(...tuple)
  }

  applyXY = (xy: IXY, isInvert?: 'invert') => {
    const { x, y } = xy
    const { a, b, c, d, tx, ty } = isInvert ? this.invert() : this
    return XY._(a * x + c * y + tx, b * x + d * y + ty)
  }

  applyAABB = (aabb: AABB, isInvert?: 'invert') => {
    const { minX, minY, maxX, maxY } = aabb
    const xy1 = this.applyXY(XY._(minX, minY), isInvert)
    const xy2 = this.applyXY(XY._(maxX, minY), isInvert)
    const xy3 = this.applyXY(XY._(maxX, maxY), isInvert)
    const xy4 = this.applyXY(XY._(minX, maxY), isInvert)
    return {
      minX: min(xy1.x, xy2.x, xy3.x, xy4.x),
      minY: min(xy1.y, xy2.y, xy3.y, xy4.y),
      maxX: max(xy1.x, xy2.x, xy3.x, xy4.x),
      maxY: max(xy1.y, xy2.y, xy3.y, xy4.y),
    }
  }

  invertXY = (xy: IXY) => {
    return this.applyXY(xy, 'invert')
  }

  invertAABB = (aabb: AABB) => {
    return this.applyAABB(aabb, 'invert')
  }

  static identity() {
    return new Matrix(1, 0, 0, 1, 0, 0)
  }

  static of(...args: IMatrixTuple) {
    return new Matrix(...args)
  }

  static fromTuple(tuple: IMatrixTuple) {
    return new Matrix(...tuple)
  }

  static fromXYR(x: number, y: number, rotation: number) {
    return Matrix.identity().rotate(rotation).translate(x, y)
  }
}
