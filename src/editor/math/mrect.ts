import { IMatrix, MATRIX } from 'src/editor/math/matrix'

export type SMRect = /** Serializable MRect */ {
  width: number
  height: number
  matrix: IMatrix
}

/**
 * MRect: matrix rect
 */
export class MRect {
  constructor(width: number, height: number, matrix: IMatrix) {
    this._width = width
    this._height = height
    this._matrix = matrix
  }

  private _width = 0
  private _height = 0
  private _matrix = MATRIX.identity()
  private _xy = XY._(0, 0)
  private _rotation = 0
  private _center = XY._(0, 0)
  private _vertexes = [XY._(0, 0), XY._(0, 0), XY._(0, 0), XY._(0, 0)]
  private _aabb = new AABB(0, 0, 0, 0)

  private needReCalcXY = true
  private needReCalcRotation = true
  private needReCalcCenter = true
  private needReCalcVertexes = true
  private needReCalcAABB = true

  get width() {
    return this._width
  }

  get height() {
    return this._height
  }

  get matrix() {
    return this._matrix
  }

  get xy() {
    if (this.needReCalcXY) {
      this._xy = this.calcXY()
      this.needReCalcXY = false
    }
    return this._xy
  }

  get rotation() {
    if (this.needReCalcRotation) {
      this._rotation = this.calcRotation()
      this.needReCalcRotation = false
    }
    return this._rotation
  }

  get center() {
    if (this.needReCalcCenter) {
      this._center = this.calcCenter()
      this.needReCalcCenter = false
    }
    return this._center
  }

  get vertexes() {
    if (this.needReCalcVertexes) {
      this._vertexes = this.calcVertexes()
      this.needReCalcVertexes = false
    }
    return this._vertexes
  }

  get aabb() {
    if (this.needReCalcAABB) {
      this._aabb = this.calcAABB()
      this.needReCalcAABB = false
    }
    return this._aabb
  }

  private calcXY() {
    return MATRIX.xy(XY._(0, 0), this.matrix)
  }

  private calcRotation() {
    const transformedXY = this.matrix.applyXY(XY.xAxis())
    return Angle.sweep(transformedXY, XY.xAxis())
  }

  private calcCenter() {
    return this.matrix.applyXY(XY._(this.width / 2, this.height / 2))
  }

  private calcVertexes() {
    return [
      this.matrix.applyXY(XY._(0, 0)),
      this.matrix.applyXY(XY._(this.width, 0)),
      this.matrix.applyXY(XY._(this.width, this.height)),
      this.matrix.applyXY(XY._(0, this.height)),
    ]
  }

  private calcAABB() {
    const [TL, TR, BR, BL] = this.vertexes
    return AABB.update(
      this._aabb,
      min(TL.x, TR.x, BR.x, BL.x),
      min(TL.y, TR.y, BR.y, BL.y),
      max(TL.x, TR.x, BR.x, BL.x),
      max(TL.y, TR.y, BR.y, BL.y),
    )
  }

  private expired() {
    this.needReCalcXY = true
    this.needReCalcRotation = true
    this.needReCalcCenter = true
    this.needReCalcVertexes = true
    this.needReCalcAABB = true
  }

  set width(width: number) {
    this._width = width
    this.expired()
  }

  set height(height: number) {
    this._height = height
    this.expired()
  }

  set matrix(matrix: MATRIX) {
    this._matrix = matrix
    this.expired()
  }

  set xy(xy: IXY) {
    const delta = XY.from(xy).minus(this.xy)
    this.matrix.translate(delta.x, delta.y)
    this._xy = xy
    this.needReCalcCenter = true
    this.needReCalcVertexes = true
    this.needReCalcAABB = true
  }

  set rotation(rotation: number) {
    const delta = rotation - this.rotation
    this.matrix.rotate(delta)
    this._rotation = rotation
    this.needReCalcVertexes = true
    this.needReCalcAABB = true
  }

  shift(delta: IXY) {
    this.matrix.translate(delta.x, delta.y)
    this.expired()
    return this
  }

  scale(scale: IXY) {
    this.matrix.scale(scale.x, scale.y)
    this.expired()
    return this
  }

  rotate(delta: number) {
    this.rotation = this._rotation + delta
    return this
  }

  update(width: number, height: number, matrix: MATRIX) {
    this._width = width
    this._height = height
    this._matrix = matrix
    this.expired()
    return this
  }

  fromSMRect(mrect: SMRect) {
    this._width = mrect.width
    this._height = mrect.height
    this._matrix = MATRIX.fromTuple(mrect.matrix)
    this.expired()
    return this
  }

  toSMRect() {
    return {
      width: this.width,
      height: this.height,
      matrix: this.matrix.tuple(),
    }
  }

  static identity() {
    return new MRect(0, 0, MATRIX.identity())
  }

  static fromSMRect(mrect: SMRect) {
    return new MRect(mrect.width, mrect.height, MATRIX.fromTuple(mrect.matrix))
  }
}
