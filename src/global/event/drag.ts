import { iife } from '@gitborlando/utils'
import { IRect } from 'src/editor/math'
import { StageViewport } from 'src/editor/stage/viewport'

type MouseEventLike = {
  clientX: number
  clientY: number
}

export type DragData = {
  current: IXY
  start: IXY
  shift: IXY
  marquee: IRect
}

export type DragOptions = {
  useRafThrottle?: boolean
  processXY?: (xy: IXY) => IXY
  processShift?: (shift: IXY) => IXY
}

export class DragHelper {
  private current = XY.$(0, 0)
  private origin = XY.$(0, 0)
  private shift = XY.$(0, 0)
  private delta = XY.$(0, 0)
  private marquee = { x: 0, y: 0, width: 0, height: 0 }
  private movePending = false
  private isInfinity = false
  private needThrottle = false
  private processXY = (xy: IXY) => xy
  private processShift = (shift: IXY) => shift
  private defaultStartHandler = (e: MouseEventLike) => {
    this.current = XY.client(e)
    this.origin = XY.client(e)
  }
  private defaultMoveHandler = (e: MouseEvent) => {}
  private defaultEndHandler = (e: MouseEventLike) => this.destroy()
  private startHandler = this.defaultStartHandler
  private moveHandler = this.defaultMoveHandler
  private endHandler = this.defaultEndHandler
  private moveCallback?: (data: DragData & { delta: IXY }) => void

  constructor(options?: DragOptions) {
    this.needThrottle = options?.useRafThrottle ?? true
    this.processXY = options?.processXY ?? this.processXY
    this.processShift = options?.processShift ?? this.processShift
  }

  needInfinity = () => {
    this.isInfinity = true
    return this
  }

  onStart = (callback?: (data: DragData) => void) => {
    if (this.startHandler !== this.defaultStartHandler) return this

    this.startHandler = (e: MouseEventLike) => {
      if (this.isInfinity) {
        document.body.requestPointerLock()
      }

      this.current = XY.client(e)
      this.origin = XY.client(e)
      this.marquee = this.calculateMarquee()

      callback?.({
        current: XY.of(this.processXY(this.current)).$(),
        start: XY.of(this.processXY(this.origin)).$(),
        shift: XY.of(this.processShift(this.shift)).$(),
        marquee: this.marquee,
      })
    }

    return this
  }

  onMove = (callback: (data: DragData & { delta: IXY }) => void) => {
    this.moveCallback = callback
    if (this.moveHandler !== this.defaultMoveHandler) return this

    this.moveHandler = (e) => {
      this.delta = XY.of(this.delta).plus(XY.$(e.movementX, e.movementY))

      if (this.movePending) return
      this.movePending = true

      const throttle = this.needThrottle ? requestAnimationFrame : iife

      throttle(() => {
        this.movePending = false

        this.current = XY.of(this.current).plus(this.delta)
        this.shift = XY.of(this.current).minus(this.origin)
        this.marquee = this.calculateMarquee()

        this.moveCallback?.({
          current: XY.of(this.processXY(this.current)).$(),
          start: XY.of(this.processXY(this.origin)).$(),
          shift: XY.of(this.processShift(this.shift)).$(),
          delta: XY.of(this.processShift(this.delta)).$(),
          marquee: this.marquee,
        })

        this.delta = XY.$(0, 0)
      })
    }

    return this
  }

  onDestroy = (callback?: (data: DragData & { moved: boolean }) => void) => {
    if (this.endHandler !== this.defaultEndHandler) return this

    this.endHandler = () => {
      this.marquee = this.calculateMarquee()

      callback?.({
        current: XY.of(this.processXY(this.current)).$(),
        start: XY.of(this.processXY(this.origin)).$(),
        shift: XY.of(this.processShift(this.shift)).$(),
        marquee: this.marquee,
        moved: this.shift.x !== 0 || this.shift.y !== 0,
      })

      this.destroy()
    }

    return this
  }

  start(event?: MouseEventLike) {
    if (event) {
      this.startHandler?.(event)
    } else {
      window.addEventListener('mousedown', this.startHandler)
    }
    window.addEventListener('mousemove', this.moveHandler)
    window.addEventListener('mouseup', this.endHandler)
    return this
  }

  private destroy = () => {
    window.removeEventListener('mousedown', this.startHandler)
    window.removeEventListener('mousemove', this.moveHandler)
    window.removeEventListener('mouseup', this.endHandler)
    this.setDataToDefault()
  }

  private calculateMarquee = () => {
    const x = this.shift.x < 0 ? this.origin.x + this.shift.x : this.origin.x
    const y = this.shift.y < 0 ? this.origin.y + this.shift.y : this.origin.y
    const width = Math.abs(this.shift.x)
    const height = Math.abs(this.shift.y)
    const xy = this.processXY(XY.$(x, y))
    const bound = this.processShift(XY.$(width, height))
    this.marquee = { ...xy, width: bound.x, height: bound.y }
    return this.marquee
  }

  private setDataToDefault = () => {
    if (this.isInfinity) {
      document.exitPointerLock()
    }
    this.current = XY.$(0, 0)
    this.origin = XY.$(0, 0)
    this.shift = XY.$(0, 0)
    this.delta = XY.$(0, 0)
    this.marquee = { x: 0, y: 0, width: 0, height: 0 }
    this.movePending = false
    this.isInfinity = false
    this.moveCallback = undefined
    this.startHandler = this.defaultStartHandler
    this.moveHandler = this.defaultMoveHandler
    this.endHandler = this.defaultEndHandler
  }
}

export const StageDrag = new DragHelper({
  processXY: (xy) => StageViewport.toSceneXY(xy),
  processShift: (shift) => StageViewport.toSceneShift(shift),
})

export const Drag = new DragHelper({})
