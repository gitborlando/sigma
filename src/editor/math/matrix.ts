import { AABB } from 'src/editor/math/aabb'
import { Angle } from 'src/editor/math/angle'
import { max, min } from 'src/editor/math/base'
import { IXY } from 'src/editor/math/types'
import { XY } from 'src/editor/math/xy'

export type IMatrix = [number, number, number, number, number, number]

export class MATRIX {
  static matrix = [1, 0, 0, 1, 0, 0] as IMatrix

  static from(matrix: IMatrix) {
    this.matrix = matrix
    return this
  }

  static of(...matrix: IMatrix) {
    this.matrix = matrix
    return this
  }

  static clone(matrix: IMatrix) {
    this.matrix = [...matrix]
    return this
  }

  static shift = (delta: IXY) => {
    this.matrix[4] += delta.x
    this.matrix[5] += delta.y
    return this
  }

  static translate = (x: number, y: number) => {
    this.matrix[4] += x
    this.matrix[5] += y
    return this
  }

  static scale = (x: number, y: number) => {
    this.matrix[0] *= x
    this.matrix[3] *= y
    this.matrix[1] *= x
    this.matrix[2] *= y
    this.matrix[4] *= x
    this.matrix[5] *= y
    return this
  }

  static rotate = (angle: number) => {
    const cos = Angle.cos(angle)
    const sin = Angle.sin(angle)

    const a1 = this.matrix[0]
    const c1 = this.matrix[2]
    const tx1 = this.matrix[4]

    this.matrix[0] = a1 * cos - this.matrix[1] * sin
    this.matrix[1] = a1 * sin + this.matrix[1] * cos
    this.matrix[2] = c1 * cos - this.matrix[3] * sin
    this.matrix[3] = c1 * sin + this.matrix[3] * cos
    this.matrix[4] = tx1 * cos - this.matrix[5] * sin
    this.matrix[5] = tx1 * sin + this.matrix[5] * cos

    return this
  }

  static append = (matrix: IMatrix) => {
    const a1 = this.matrix[0]
    const b1 = this.matrix[1]
    const c1 = this.matrix[2]
    const d1 = this.matrix[3]

    this.matrix[0] = matrix[0] * a1 + matrix[1] * c1
    this.matrix[1] = matrix[0] * b1 + matrix[1] * d1
    this.matrix[2] = matrix[2] * a1 + matrix[3] * c1
    this.matrix[3] = matrix[2] * b1 + matrix[3] * d1

    this.matrix[4] = matrix[4] * a1 + matrix[5] * c1 + this.matrix[4]
    this.matrix[5] = matrix[4] * b1 + matrix[5] * d1 + this.matrix[5]

    return this
  }

  static prepend = (matrix: IMatrix) => {
    const tx1 = this.matrix[4]

    if (matrix[0] !== 1 || matrix[1] !== 0 || matrix[2] !== 0 || matrix[3] !== 1) {
      const a1 = this.matrix[0]
      const c1 = this.matrix[2]

      this.matrix[0] = a1 * matrix[0] + this.matrix[1] * matrix[2]
      this.matrix[1] = a1 * matrix[1] + this.matrix[1] * matrix[3]
      this.matrix[2] = c1 * matrix[0] + this.matrix[3] * matrix[2]
      this.matrix[3] = c1 * matrix[1] + this.matrix[3] * matrix[3]
    }

    this.matrix[4] = tx1 * matrix[0] + this.matrix[5] * matrix[2] + matrix[4]
    this.matrix[5] = tx1 * matrix[1] + this.matrix[5] * matrix[3] + matrix[5]

    return this
  }

  static invert = () => {
    const [a, b, c, d, tx, ty] = this.matrix
    const invDet = 1 / (a * d - b * c)
    const tuple = [d, -b, -c, a, c * ty - d * tx, b * tx - a * ty].map(
      (i) => i * invDet,
    ) as IMatrix
    return MATRIX.clone(tuple)
  }

  static xy = (xy: IXY, isInvert?: 'invert') => {
    const { x, y } = xy
    if (isInvert) {
      const [a, b, c, d, tx, ty] = this.matrix
      const invDet = 1 / (a * d - b * c)
      const invA = d * invDet
      const invB = -b * invDet
      const invC = -c * invDet
      const invD = a * invDet
      const invTx = (c * ty - d * tx) * invDet
      const invTy = (b * tx - a * ty) * invDet
      return XY._(invA * x + invC * y + invTx, invB * x + invD * y + invTy)
    }
    const [a, b, c, d, tx, ty] = this.matrix
    return XY._(a * x + c * y + tx, b * x + d * y + ty)
  }

  static aabb = (aabb: AABB, isInvert?: 'invert') => {
    const { minX, minY, maxX, maxY } = aabb
    const xy1 = MATRIX.xy(XY._(minX, minY), isInvert)
    const xy2 = MATRIX.xy(XY._(maxX, minY), isInvert)
    const xy3 = MATRIX.xy(XY._(maxX, maxY), isInvert)
    const xy4 = MATRIX.xy(XY._(minX, maxY), isInvert)
    return {
      minX: min(xy1.x, xy2.x, xy3.x, xy4.x),
      minY: min(xy1.y, xy2.y, xy3.y, xy4.y),
      maxX: max(xy1.x, xy2.x, xy3.x, xy4.x),
      maxY: max(xy1.y, xy2.y, xy3.y, xy4.y),
    }
  }

  static invertXY = (xy: IXY) => {
    return MATRIX.xy(xy, 'invert')
  }

  static invertAABB = (aabb: AABB) => {
    return MATRIX.aabb(aabb, 'invert')
  }

  static identity() {
    return [1, 0, 0, 1, 0, 0] as IMatrix
  }

  static fromXYR(x: number, y: number, rotation: number) {
    return MATRIX.of(1, 0, 0, 1, 0, 0).rotate(rotation).translate(x, y)
  }

  static isFlipped(matrix: IMatrix) {
    return matrix[0] * matrix[3] - matrix[1] * matrix[2] < 0
  }
}

export function Matrix(matrix: IMatrix) {
  return MATRIX.from(matrix)
}
