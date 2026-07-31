import { getSet, match, NoopFunc } from '@gitborlando/utils'
import { Elem } from 'src/editor/render/elem/elem'

type ElemEventBase = {
  hostEvent: Event
  stopPropagation: () => void
  ancestors: Elem[]
}

export type ElemEventType = 'mousedown' | 'mousemove' | 'hover'

export type ElemEvent = ElemMouseEvent

export type ElemMouseEvent = ElemEventBase & {
  xy: IXY
  hovered: boolean
  hostEvent: MouseEvent
  localXY: IXY
  globalXY: IXY
}

export type ElemEventFunc = (e: ElemEvent) => void

export class ElemEventHandler {
  hitTest = (xy: IXY) => false
  private lastHit = false

  private mousedown: ElemEventFunc[] = []
  private mousemove: ElemEventFunc[] = []
  private hover: ElemEventFunc[] = []

  private eventCount = 0
  private hitTestCache = new Map<string, (xy: IXY) => boolean>()

  cacheHitTest = (createHitTest: () => (xy: IXY) => boolean, deps: any[]) => {
    this.hitTest = getSet(this.hitTestCache, 'hitTest', createHitTest, deps)
  }

  addEvent = (type: ElemEventType, func: ElemEventFunc) => {
    this[type].push(func)
    this.eventCount++

    return () => this.removeEvent(type, func)
  }

  removeEvent = (type: ElemEventType, func: ElemEventFunc) => {
    const index = this[type].indexOf(func)
    if (index === -1) return

    this[type].splice(index, 1)
    this.eventCount--
  }

  dispose() {
    this.mousedown = []
    this.mousemove = []
    this.hover = []
    this.eventCount = 0
    this.hitTestCache.clear()
  }

  triggerEvent = (props: {
    e: MouseEvent
    xy: IXY
    globalXY: IXY
    hit: boolean
    stopPropagation: NoopFunc
    ancestors: Elem[]
  }) => {
    if (this.eventCount === 0) return

    const { e, xy, globalXY, hit, stopPropagation, ancestors } = props
    const mouseEvent = { xy, stopPropagation, hostEvent: e as MouseEvent, ancestors }
    const mouseEventCallback = (func: ElemEventFunc) =>
      func({ ...mouseEvent, hovered: hit, localXY: xy, globalXY })

    match(e.type, {
      mousedown: () => {
        if (hit) this.mousedown.forEach(mouseEventCallback)
      },
      mousemove: () => {
        if (hit) this.mousemove.forEach(mouseEventCallback)
        if (hit !== this.lastHit) {
          this.lastHit = hit
          this.hover.forEach(mouseEventCallback)
        }
      },
    })
  }
}
