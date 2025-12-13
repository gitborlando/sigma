import { Angle } from 'src/editor/math/angle'
import { IRect } from 'src/editor/math/types'
import { AABB } from './aabb'

type IAxis = { widthAxis: IXY; heightAxis: IXY }

export class OBB {
  center: IXY
  axis: IAxis
  aabb: AABB
  vertexes: [IXY, IXY, IXY, IXY]

  constructor(
    public x: number,
    public y: number,
    public width: number,
    public height: number,
    public rotation: number,
  ) {
    this.center = this.#calcCenter()
    this.axis = this.#calcAxis()
    this.vertexes = this.calcVertexXY()
    this.aabb = AABB.fromOBB(this)
  }

  get xy() {
    return XY._(this.x, this.y)
  }

  #calcCenter = () => {
    const center = XY._(this.x + this.width / 2, this.y + this.height / 2)
    return XY.of(center).rotate(XY._(this.x, this.y), this.rotation).xy
  }

  #calcAxis = () => {
    const cos = Angle.cos(this.rotation)
    const sin = Angle.sin(this.rotation)
    const widthAxis = XY._(cos, -sin)
    const heightAxis = XY._(sin, cos)
    return (this.axis = { widthAxis, heightAxis })
  }

  shift = (delta: IXY) => {
    return this.update(
      this.x + delta.x,
      this.y + delta.y,
      this.width,
      this.height,
      this.rotation,
    )
  }

  update = (
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number,
  ) => {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.rotation = rotation
    this.center = this.#calcCenter()
    this.axis = this.#calcAxis()
    this.vertexes = this.calcVertexXY()
    this.aabb = AABB.updateFromOBB(this.aabb, this)
    return this
  }

  updateFromRect = (rect: IRect, rotation: number) => {
    return this.update(rect.x, rect.y, rect.width, rect.height, rotation)
  }

  calcVertexXY = () => {
    const cos = Angle.cos(this.rotation)
    const sin = Angle.sin(this.rotation)
    const cosWidth = cos * this.width
    const sinWidth = sin * this.width
    const cosHeight = cos * this.height
    const sinHeight = sin * this.height
    const TL = XY._(this.x, this.y)
    const TR = XY._(this.x + cosWidth, this.y + sinWidth)
    const BR = XY._(this.x + cosWidth - sinHeight, this.y + sinWidth + cosHeight)
    const BL = XY._(this.x - sinHeight, this.y + cosHeight)
    return (this.vertexes = [TL, TR, BR, BL])
  }

  clone = () => {
    return new OBB(this.x, this.y, this.width, this.height, this.rotation)
  }

  projectionLengthAt = (anotherAxis: IXY) => {
    const { widthAxis, heightAxis } = this.axis
    return (
      Math.abs(XY.of(widthAxis).dot(anotherAxis)) * this.width +
      Math.abs(XY.of(heightAxis).dot(anotherAxis)) * this.height
    )
  }

  collide = (another: OBB) => {
    const centerVector = XY.of(this.center).minus(another.center).xy
    if (
      this.projectionLengthAt(another.axis.widthAxis) + another.width <=
      2 * Math.abs(XY.of(centerVector).dot(another.axis.widthAxis))
    )
      return false
    if (
      this.projectionLengthAt(another.axis.heightAxis) + another.height <=
      2 * Math.abs(XY.of(centerVector).dot(another.axis.heightAxis))
    )
      return false
    if (
      another.projectionLengthAt(this.axis.widthAxis) + this.width <=
      2 * Math.abs(XY.of(centerVector).dot(this.axis.widthAxis))
    )
      return false
    if (
      another.projectionLengthAt(this.axis.heightAxis) + this.height <=
      2 * Math.abs(XY.of(centerVector).dot(this.axis.heightAxis))
    )
      return false
    return true
  }

  static identity() {
    return new OBB(0, 0, 0, 0, 0)
  }

  static fromRect(rect: IRect, rotation = 0): OBB {
    const { x, y, width, height } = rect
    return new OBB(x, y, width, height, rotation)
  }

  static fromCenter(center: IXY, width: number, height: number, rotation = 0) {
    const dx = center.x - width / 2
    const dy = center.y - height / 2
    const xy = XY.of(XY._(dx, dy)).rotate(center, rotation).xy
    return new OBB(xy.x, xy.y, width, height, rotation)
  }

  static fromAABB(aabb: AABB): OBB {
    const { minX, minY, maxX, maxY } = aabb
    return new OBB(minX, minY, maxX - minX, maxY - minY, 0)
  }
}
