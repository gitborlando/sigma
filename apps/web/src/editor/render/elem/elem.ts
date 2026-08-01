import { AABB, type IXY } from '@gitborlando/geo'
import { type IMatrix, Matrix, MRect } from 'src/editor/geometry'
import {
  ElemEventFunc,
  ElemEventHandler,
  ElemEventType,
} from 'src/editor/render/elem/event'
import { memorized } from 'src/utils/export'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      elem: ElemProps
    }
  }
}

export type ElemProps = {
  node: S.Node
  hidden?: boolean
  events?: Partial<ElemEventsMap>
  children?: ReactNode
}

export type ElemEventsMap = Record<ElemEventType, ElemEventFunc>

export type ElemContext = { collectDirty: (elem: Elem) => void }

export class Elem {
  constructor(
    public context: ElemContext,
    public id = '',
    public type: 'sceneElem' | 'widgetElem',
  ) {}
  clip = false
  hidden = false
  optimize = false
  node!: S.Node

  private _mrect = MRect.identity()
  private memoMRect = memorized(() => this._mrect.clone(this.node))
  get mrect(): MRect {
    return this.memoMRect([this.node.width, this.node.height, this.node.matrix])
  }

  private memoRenderMatrix = memorized(() => {
    const { matrix, width, height, flip } = this.node
    const flipX = flip & 1 ? -1 : 1
    const flipY = flip & 2 ? -1 : 1
    return Matrix.of(matrix)
      .append({
        a: flipX,
        b: 0,
        c: 0,
        d: flipY,
        tx: flipX === -1 ? width : 0,
        ty: flipY === -1 ? height : 0,
      })
      .plain()
  })
  get renderMatrix(): IMatrix {
    return this.memoRenderMatrix([
      this.node.width,
      this.node.height,
      this.node.matrix,
      this.node.flip,
    ])
  }

  private memoAABB = memorized(() =>
    Matrix.of(this.globalMatrix).applyAABB({
      minX: 0,
      minY: 0,
      maxX: this.node.width,
      maxY: this.node.height,
    }),
  )
  get aabb(): AABB {
    return this.memoAABB([this.globalMatrix, this.node.width, this.node.height])
  }

  private _globalMatrix = Matrix.identity()
  private memoGlobalMatrix = memorized(() => {
    return Matrix.of(this.parent.globalMatrix).append(this.renderMatrix)
  })
  get globalMatrix(): IMatrix {
    if (!this.parent) return this._globalMatrix
    if (!this.node) return this.parent.globalMatrix
    return this.memoGlobalMatrix([this.renderMatrix, this.parent.globalMatrix])
  }

  lastPaintRect?: AABB

  get estimatedPaintRect() {
    if (!this.lastPaintRect) return this.aabb
    return AABB.merge([this.lastPaintRect, this.aabb])
  }

  cachePaintRect(bounds: AABB) {
    this.lastPaintRect = AABB.clone(bounds)
  }

  getVisible(sceneAABB: AABB, latestPaintRect?: AABB) {
    if (this.hidden) return false
    if (this.id === 'sceneRoot') return true
    if (this.type === 'widgetElem') return true
    return AABB.collide(latestPaintRect ?? this.estimatedPaintRect, sceneAABB)
  }

  dirty() {
    this.context.collectDirty(this)
  }

  parent!: Elem
  children: Elem[] = []

  addChild(elem: Elem, index?: number) {
    if (elem.parent === this) {
      const oldIndex = this.children.indexOf(elem)
      const nextIndex = index ?? this.children.length - 1
      if (oldIndex !== -1 && oldIndex !== nextIndex) {
        this.children.splice(oldIndex, 1)
        this.children.splice(nextIndex, 0, elem)
        this.dirty()
      }
      return
    }

    elem.parent?.removeChild(elem)
    elem.parent = this

    this.children.splice(index ?? this.children.length, 0, elem)

    elem.dirty()
    this.dirty()
  }

  insertBefore(elem: Elem, beforeElem: Elem) {
    const index = this.children.indexOf(beforeElem)
    this.addChild(elem, index === -1 ? this.children.length : index)
  }

  removeChild(elem: Elem) {
    const index = this.children.indexOf(elem)
    if (index === -1) return

    elem.dirty()
    elem.parent = undefined!

    this.children.splice(index, 1)
    this.dirty()
  }

  eventHandle = new ElemEventHandler()

  get hitTest() {
    return this.eventHandle.hitTest
  }
  set hitTest(hitTest: (xy: IXY) => boolean) {
    this.eventHandle.hitTest = hitTest
  }

  addEvent(type: ElemEventType, func: ElemEventFunc) {
    return this.eventHandle.addEvent(type, func)
  }

  removeEvent(type: ElemEventType, func: ElemEventFunc) {
    return this.eventHandle.removeEvent(type, func)
  }

  destroy() {
    this.dirty()
    this.eventHandle.dispose()
    this.parent?.removeChild(this)
  }
}
