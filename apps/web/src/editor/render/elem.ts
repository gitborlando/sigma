import { AABB, type IXY } from '@gitborlando/geo'
import { getSet, type NoopFunc } from '@gitborlando/utils'
import { type IMatrix, Matrix, MRect } from 'src/editor/geometry'
import type { RenderInvalidator } from 'src/editor/render/invalidator'
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
  events?: Partial<Record<ElemEventType, ElemEventFunc>>
  children?: ReactNode[]
}

export type ElemContext = {
  renderInvalidator: RenderInvalidator
}

export class Elem {
  constructor(
    public context: ElemContext,
    public id = '',
    public type: 'sceneElem' | 'widgetElem',
  ) {}
  clip = false
  hidden = false
  optimize = false

  private _node!: S.Node
  get node() {
    return this._node
  }
  set node(node: S.Node) {
    this.dirty()
    this._node = node
    this.dirty()
  }

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

  getVisible(sceneAABB: AABB) {
    if (this.hidden) return false
    if (this.id === 'sceneRoot') return true
    if (this.type === 'widgetElem') return true
    return AABB.collide(this.aabb, sceneAABB)
  }

  dirty() {
    this.context.renderInvalidator.collectDirty(this)
  }

  getDirtyRect() {
    if (!this.node) return null
    return this.aabb
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

    this.children.splice(index, 1)
    elem.parent = undefined!
    elem.dirty()
    this.dirty()
  }

  eventHandle = new ElemEventHandler(this)

  get hitTest() {
    return this.eventHandle.hitTest
  }
  set hitTest(hitTest: (xy: IXY) => boolean) {
    this.eventHandle.hitTest = hitTest
  }

  addEvent(
    type: ElemEventType,
    func: ElemEventFunc,
    option?: { capture?: boolean },
  ) {
    return this.eventHandle.addEvent(type, func, option)
  }

  removeEvent(
    type: ElemEventType,
    func: ElemEventFunc,
    option?: { capture?: boolean },
  ) {
    return this.eventHandle.removeEvent(type, func, option)
  }

  destroy() {
    this.dirty()
    this.eventHandle.dispose()
    this.parent?.removeChild(this)
  }
}

export type ElemEventType = 'mousedown' | 'mousemove' | 'hover'

type ElemEventBase = {
  hostEvent: Event
  stopPropagation: () => void
}

export type ElemEvent = ElemMouseEvent

export type ElemMouseEvent = ElemEventBase & {
  xy: IXY
  hovered: boolean
  hostEvent: MouseEvent
}

export type ElemEventFunc = (e: ElemMouseEvent) => void

class ElemEventHandler {
  hitTest = (xy: IXY) => false
  private lastHit = [false, false]

  private mousedown: ElemEventFunc[][] = [[], []]
  private mousemove: ElemEventFunc[][] = [[], []]
  private hover: ElemEventFunc[][] = [[], []]
  private eventCount = 0

  constructor(private elem: Elem) {}

  private hitTestCache = new Map<string, (xy: IXY) => boolean>()

  cacheHitTest = (createHitTest: () => (xy: IXY) => boolean, deps: any[]) => {
    this.hitTest = getSet(this.hitTestCache, 'hitTest', createHitTest, deps)
  }

  addEvent = (
    type: ElemEventType,
    func: ElemEventFunc,
    option?: { capture?: boolean },
  ) => {
    const capture = option?.capture ? 0 : 1

    this[type][capture].push(func)
    this.eventCount++

    return () => {
      const index = this[type][capture].indexOf(func)
      if (index === -1) return

      this[type][capture].splice(index, 1)
      this.eventCount--
    }
  }

  removeEvent = (
    type: ElemEventType,
    func: ElemEventFunc,
    option?: { capture?: boolean },
  ) => {
    const capture = option?.capture ? 0 : 1
    const index = this[type][capture].indexOf(func)
    if (index === -1) return

    this[type][capture].splice(index, 1)
    this.eventCount--
  }

  dispose() {
    this.mousedown = [[], []]
    this.mousemove = [[], []]
    this.hover = [[], []]
    this.eventCount = 0
    this.hitTestCache.clear()
  }

  triggerMouseEvent = (
    e: MouseEvent,
    xy: IXY,
    hit: boolean,
    isCapture: boolean,
    stopPropagation: NoopFunc,
  ) => {
    if (this.eventCount === 0) return

    const capture = isCapture ? 0 : 1
    const mouseEvent = {
      xy,
      stopPropagation,
      hostEvent: e as MouseEvent,
    }

    switch (e.type) {
      case 'mousedown':
        if (hit) {
          this.mousedown[capture].forEach((func) =>
            func({ ...mouseEvent, hovered: true }),
          )
        }
        break

      case 'mousemove':
        if (hit) {
          this.mousemove[capture].forEach((func) =>
            func({ ...mouseEvent, hovered: true }),
          )
        }
        if (hit !== this.lastHit[capture]) {
          this.lastHit[capture] = hit
          this.hover[capture].forEach((func) =>
            func({ ...mouseEvent, hovered: hit }),
          )
        }
        break
    }
  }
}
