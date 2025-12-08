import { iife, noopFunc } from '@gitborlando/utils'
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
  throttle?: boolean
  processingXY?: (xy: IXY) => IXY
  processingShift?: (shift: IXY) => IXY
}

export class DragHelper {
  private canMove = false
  private started = false
  private current = XY.of(0, 0)
  private start = XY.of(0, 0)
  private shift = XY.of(0, 0)
  private delta = XY.of(0, 0)
  private marquee = { x: 0, y: 0, width: 0, height: 0 }
  private startHandler?: (e: MouseEventLike) => any
  private moveHandler?: (e: MouseEvent) => any
  private endHandler?: (e: MouseEvent) => any
  private movePending = false
  private isInfinity = false
  private needThrottle = false
  private processingXY = (xy: IXY) => xy
  private processingShift = (shift: IXY) => shift

  constructor(options?: DragOptions) {
    this.needThrottle = options?.throttle ?? true
    this.processingXY = options?.processingXY ?? this.processingXY
    this.processingShift = options?.processingShift ?? this.processingShift
  }

  needInfinity = () => {
    this.isInfinity = true
    return this
  }

  onStart = (eventOrCallback?: MouseEventLike | ((data: DragData) => void)) => {
    if (this.startHandler) return this

    const isCallback = typeof eventOrCallback === 'function'
    const event = isCallback ? undefined : eventOrCallback
    const callback = isCallback ? eventOrCallback : undefined

    this.startHandler = (e: MouseEventLike) => {
      if (this.isInfinity) {
        document.body.requestPointerLock()
      }

      this.current = XY.client(e)
      this.start = XY.client(e)
      this.marquee = this.calculateMarquee()

      callback?.({
        current: this.processingXY(this.current.plain()),
        start: this.processingXY(this.start.plain()),
        shift: this.processingShift(this.shift.plain()),
        marquee: this.marquee,
      })

      this.canMove = true
      this.started = true
    }

    if (event) {
      this.startHandler(event)
    } else {
      window.addEventListener('mousedown', this.startHandler)
    }

    return this
  }

  onMove = (callback: (data: DragData & { delta: IXY }) => void) => {
    if (this.moveHandler) return this

    this.moveHandler = (e) => {
      this.delta = this.delta.plus(XY._(e.movementX, e.movementY))

      if (this.movePending) return
      this.movePending = true

      const throttleFunc = this.needThrottle ? requestAnimationFrame : iife

      throttleFunc(() => {
        this.movePending = false

        if (!this.canMove) return
        this.canMove = true

        if (!this.started) {
          this.startHandler?.(e)
          this.started = true
        }

        this.current = this.current.plus(this.delta)
        this.shift = this.current.minus(this.start)
        this.marquee = this.calculateMarquee()

        callback({
          current: this.processingXY(this.current.plain()),
          start: this.processingXY(this.start.plain()),
          shift: this.processingShift(this.shift.plain()),
          delta: this.processingShift(this.delta.plain()),
          marquee: this.marquee,
        })

        this.delta = XY.of(0, 0)
      })
    }

    window.addEventListener('mousemove', this.moveHandler)

    return this
  }

  onDestroy = (callback?: (data: DragData & { moved: boolean }) => void) => {
    if (this.endHandler) return this

    this.endHandler = () => {
      if (!this.canMove) return

      this.marquee = this.calculateMarquee()

      callback?.({
        current: this.processingXY(this.current.plain()),
        start: this.processingXY(this.start.plain()),
        shift: this.processingShift(this.shift.plain()),
        marquee: this.marquee,
        moved: this.shift.x !== 0 || this.shift.y !== 0,
      })

      this.destroy()
    }

    window.addEventListener('mouseup', this.endHandler)

    return this
  }

  onSlide = (
    callback: (data: DragData & { delta: IXY }) => void,
    e?: MouseEventLike,
  ) => {
    this.onStart(e).onMove(callback).onDestroy()
    return this
  }

  private destroy = () => {
    window.removeEventListener('mousedown', this.startHandler || noopFunc)
    window.removeEventListener('mousemove', this.moveHandler || noopFunc)
    window.removeEventListener('mouseup', this.endHandler || noopFunc)
    this.startHandler = undefined
    this.moveHandler = undefined
    this.endHandler = undefined

    if (this.isInfinity) {
      document.exitPointerLock()
    }

    this.setDataToDefault()
  }

  private calculateMarquee = () => {
    const x = this.shift.x < 0 ? this.start.x + this.shift.x : this.start.x
    const y = this.shift.y < 0 ? this.start.y + this.shift.y : this.start.y
    const width = Math.abs(this.shift.x)
    const height = Math.abs(this.shift.y)
    const xy = this.processingXY(XY.of(x, y))
    const bound = this.processingShift(XY.of(width, height))
    this.marquee = { ...xy, width: bound.x, height: bound.y }
    return this.marquee
  }

  private setDataToDefault = () => {
    this.started = false
    this.canMove = false
    this.movePending = false
    this.isInfinity = false
    this.current = XY.of(0, 0)
    this.start = XY.of(0, 0)
    this.shift = XY.of(0, 0)
    this.delta = XY.of(0, 0)
    this.marquee = { x: 0, y: 0, width: 0, height: 0 }
  }
}

export const StageDrag = new DragHelper({
  processingXY: (xy) => StageViewport.toSceneXY(xy),
  processingShift: (shift) => StageViewport.toSceneShift(shift),
})

export const Drag = new DragHelper({})
