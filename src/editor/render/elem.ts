import { createObjCache, loopFor } from '@gitborlando/utils'
import { getEditorSetting } from 'src/editor/editor/setting'
import { ElemDrawer } from 'src/editor/render/draw'
import { StageSurface } from 'src/editor/render/surface'
import { StageViewport } from 'src/editor/stage/viewport'
import { INoopFunc, IXY } from 'src/shared/utils/normal'
import { memorized } from 'src/utils/common'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      elem: ElemProps
    }
  }
}

export type ElemProps = {
  node: V1.Node
  hidden?: boolean
  events?: Partial<Record<ElemEventType, ElemEventFunc>>
  children?: ReactNode[]
}

export class Elem {
  constructor(
    public id = '',
    public type: 'sceneElem' | 'widgetElem',
  ) {}
  clip = false
  hidden = false
  optimize = false

  private _node!: V1.Node
  get node() {
    return this._node
  }
  set node(node: V1.Node) {
    StageSurface.collectDirty(this)
    this._node = node
    StageSurface.collectDirty(this)
  }

  private _mrect = MRect.identity()
  private memoMRect = memorized(() => {
    return this._mrect.clone(this.node)
  })
  get mrect() {
    return this.memoMRect([this.node.width, this.node.height, this.node.matrix])
  }

  get aabb() {
    return this.mrect.aabb
  }

  private memoVisible = memorized(() => {
    return StageSurface.testVisible(this.aabb)
  })
  get visible() {
    if (this.hidden) return false
    if (this.id === 'sceneRoot') return true
    if (this.type === 'widgetElem') return true
    return this.memoVisible([
      this.aabb.minX,
      this.aabb.minY,
      this.aabb.maxX,
      this.aabb.maxY,
      StageViewport.sceneAABB,
    ])
  }

  getDirtyRect() {
    if (!this.node) return null
    return this.aabb
  }

  traverseDraw() {
    if (!this.visible) return

    if (getEditorSetting().ignoreUnVisible && this.optimize) {
      const visualSize = StageSurface.getVisualSize(this.aabb)
      if (visualSize.x < 2 && visualSize.y < 2) return
    }

    const resetCtx = StageSurface.setCurrentCtxType(
      this.type === 'widgetElem' ? 'topCanvas' : 'mainCanvas',
    )

    StageSurface.ctxSaveRestore((ctx) => {
      const path2d = new Path2D()
      let resetTransform = () => {}

      if (this.node) {
        resetTransform = StageSurface.setTransform(this.node.matrix)
        StageSurface.ctxSaveRestore(() => ElemDrawer.draw(this, ctx, path2d))
      }

      if (this.children.length) {
        if (this.clip) ctx.clip(path2d)
        this.children.forEach((child) => child.traverseDraw())
      }

      resetTransform()
    })

    resetCtx()
  }

  parent!: Elem
  children: Elem[] = []

  addChild(elem: Elem, index?: number) {
    if (elem.parent === this) return

    elem.parent = this
    this.children.splice(index ?? this.children.length, 0, elem)
  }

  insertBefore(elem: Elem, beforeElem: Elem) {
    const index = this.children.indexOf(beforeElem)
    this.addChild(elem, index === -1 ? this.children.length : index)
  }

  removeChild(elem: Elem) {
    const index = this.children.indexOf(elem)
    if (index !== -1) this.children.splice(index, 1)
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
    this.eventHandle.dispose()
    this.parent?.removeChild(this)
    StageSurface.collectDirty(this)
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

  private hitTestCache = createObjCache<(xy: IXY) => boolean>()

  cacheHitTest = (createHitTest: () => (xy: IXY) => boolean, deps: any[]) => {
    this.hitTest = this.hitTestCache.getSet('hitTest', createHitTest, deps)
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
    stopPropagation: INoopFunc,
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

export class HitTest {
  static hitRoundRect(w: number, h: number, r: number) {
    return (xy: IXY) => {
      const inRect = xy.x >= 0 && xy.x <= w && xy.y >= 0 && xy.y <= h
      if (r === 0) {
        return inRect
      } else {
        if (!inRect) return false
        if (XY.distance(xy, XY.$(r, r)) > r && xy.x < r && xy.y < r) return false
        if (XY.distance(xy, XY.$(w - r, r)) > r && xy.x > w - r && xy.y < r)
          return false
        if (XY.distance(xy, XY.$(w - r, h - r)) > r && xy.x > w - r && xy.y > h - r)
          return false
        if (XY.distance(xy, XY.$(r, h - r)) > r && xy.x < r && xy.y > h - r)
          return false
        return true
      }
    }
  }

  static hitPolygon(xys: IXY[]) {
    return (xy: IXY) => {
      return this.inPolygon(xys, xy)
    }
  }

  static hitPolyline(xys: IXY[], spread: number) {
    const polygons: IXY[][] = []
    loopFor(xys, (cur, next) => {
      polygons.push(this.twoPointsSpreadRect(cur, next, spread))
    })
    return (xy: IXY) => {
      for (let i = 0; i < polygons.length; i++) {
        if (this.inPolygon(polygons[i], xy)) return true
      }
      return false
    }
  }

  static hitEllipse(
    cx: number,
    cy: number,
    a: number,
    b: number,
    startAngle: number,
    endAngle: number,
    innerRate: number,
  ) {
    return (xy: IXY) => {
      const dx = xy.x - cx
      const dy = xy.y - cy

      const hit = (a: number, b: number) =>
        (dx * dx * a * b) / (a * a) + (dy * dy * a * b) / (b * b) <= a * b

      const hitOuter = hit(a, b)
      if (!hitOuter) return false

      if (innerRate) {
        const hitInner = hit(a * innerRate, b * innerRate)
        if (hitInner) return false
      }

      startAngle = Angle.normal(startAngle)
      endAngle = Angle.normal(endAngle)

      if (startAngle === 0 && endAngle === 0) return true

      const angle = Angle.sweep(XY.vector(xy, XY.$(cx, cy)))

      if (startAngle <= endAngle) {
        return angle >= startAngle && angle <= endAngle
      } else {
        return angle >= startAngle || angle <= endAngle
      }
    }
  }

  static hitPoint(center: IXY, size: number) {
    return (xy: IXY) => {
      return HitTest.hitEllipse(
        center.x,
        center.y,
        size / 2,
        size / 2,
        0,
        360,
        0,
      )(xy)
    }
  }

  private static inPolygon(xys: IXY[], xy: IXY) {
    let inside = false
    loopFor(xys, (cur, next) => {
      if (cur.y > xy.y && next.y > xy.y) return
      if (cur.y < xy.y && next.y < xy.y) return
      const small = cur.y < next.y ? cur : next
      const large = cur.y > next.y ? cur : next
      const A = XY.of(large).minus(small)
      const B = XY.of(xy).minus(small)
      if (A.x * B.y - A.y * B.x > 0) inside = !inside
    })
    return inside
  }

  private static twoPointsSpreadRect(p1: IXY, p2: IXY, spread: number) {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const radian = Math.atan2(dy, dx)
    const xShift = spread * Math.sin(radian)
    const yShift = spread * Math.cos(radian)
    const TL = XY.$(p1.x - xShift, p1.y + yShift)
    const TR = XY.$(p2.x - xShift, p2.y + yShift)
    const BR = XY.$(p2.x + xShift, p2.y - yShift)
    const BL = XY.$(p1.x + xShift, p1.y - yShift)
    return [TL, TR, BR, BL]
  }
}
