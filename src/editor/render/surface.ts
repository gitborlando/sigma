import { NoopFunc, reverseFor } from '@gitborlando/utils'
import { listen } from '@gitborlando/utils/browser'
import { getEditorSetting } from 'src/editor/editor/setting'
import { AABB, OBB } from 'src/editor/math'
import { abs, round } from 'src/editor/math/base'
import { Matrix } from 'src/editor/math/matrix'
import { StageScene } from 'src/editor/render/scene'
import {
  TextBreaker,
  createTextBreaker,
} from 'src/editor/render/text-break/text-breaker'
import { StageViewport, getZoom } from 'src/editor/stage/viewport'
import { Raf, getTime } from 'src/shared/utils/normal'
import { rgba } from 'src/utils/color'
import TinyQueue from 'tinyqueue'
import { Elem } from './elem'

const dpr = devicePixelRatio

export type SurfaceCanvasType = 'mainCanvas' | 'topCanvas'

export type SurfaceRenderType =
  | 'firstFullRender'
  | 'nextFullRender'
  | 'partialRender'

export class StageSurfaceService {
  inited = Signal.create(false)

  private container!: HTMLDivElement

  private canvas!: HTMLCanvasElement
  private ctx!: CanvasRenderingContext2D

  private topCanvas!: HTMLCanvasElement
  private topCtx!: CanvasRenderingContext2D

  private bufferCanvas = new OffscreenCanvas(0, 0)
  private bufferCtx = this.bufferCanvas.getContext('2d')!

  textBreaker!: TextBreaker
  async initTextBreaker() {
    this.textBreaker = await createTextBreaker()
  }

  private disposer = new Disposer()

  subscribe() {
    return Disposer.collect(
      this.inited.hook(() => {
        this.disposer.add(this.onResize(), this.onZoomMove(), this.onPointerEvents())
        this.requestRenderTopCanvas()
      }),
      this.devShowDirtyRect(),
      this.dispose,
    )
  }

  private dispose() {
    this.inited.value = false
    this.container = undefined as any
    this.canvas = undefined as any
    this.topCanvas = undefined as any
    this.disposer.dispose()
  }

  setContainer = (container: HTMLDivElement) => {
    if (this.container) return
    this.container = container
  }

  setCanvas = (canvas: HTMLCanvasElement) => {
    if (this.canvas) return
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.currentCtx = this.ctx
  }

  setTopCanvas = (canvas: HTMLCanvasElement) => {
    if (this.topCanvas) return
    this.topCanvas = canvas
    this.topCtx = canvas.getContext('2d')!
  }

  setCursor = (cursor: string) => {
    this.container.style.cursor = cursor
  }

  clearSurface = () => {
    this.currentCtx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  ctxSaveRestore(func: (ctx: CanvasRenderingContext2D) => any) {
    this.currentCtx.save()
    func(this.currentCtx)
    this.currentCtx.restore()
  }

  private currentCtx = this.ctx

  setCurrentCtxType = (type: SurfaceCanvasType) => {
    let lastCtx = this.currentCtx
    this.currentCtx = type === 'mainCanvas' ? this.ctx : this.topCtx
    return () => (this.currentCtx = lastCtx)
  }

  setOBBMatrix = (obb: OBB, inverse = false) => {
    const { x, y, rotation } = obb
    if (!inverse) {
      this.currentCtx.translate(x, y)
      this.currentCtx.rotate(Angle.radianFy(rotation))
    } else {
      this.currentCtx.rotate(-Angle.radianFy(rotation))
      this.currentCtx.translate(-x, -y)
    }
  }

  private renderType?: SurfaceRenderType
  private renderTasks: NoopFunc[] = []
  private raf = new Raf()

  private requestRender = (type: SurfaceRenderType) => {
    if (this.renderType === type) return
    this.renderType = type

    if (type === 'partialRender' && this.renderTasks.length) return

    if (type === 'firstFullRender') this.calcFullRenderElemsMinHeap()
    if (type !== 'nextFullRender') this.renderTasks.length = 0

    this.renderTasks.push(() => {
      if (type === 'firstFullRender') this.clearSurface()
      if (type === 'partialRender') this.partialRender()
      else this.fullRender()
    })

    this.raf.cancelAll().request((next) => {
      this.ctxSaveRestore(() => this.renderTasks.pop()?.())
      this.renderType = undefined
      this.renderTasks.length && next()
    })
  }

  onRenderTopCanvas = Signal.create()

  private hasRequestedRenderTopCanvas = false

  private requestRenderTopCanvas = () => {
    if (this.hasRequestedRenderTopCanvas) return
    this.hasRequestedRenderTopCanvas = true

    requestAnimationFrame(() => {
      this.hasRequestedRenderTopCanvas = false

      const resetCtx = this.setCurrentCtxType('topCanvas')
      this.clearSurface()
      this.ctxSaveRestore(() => {
        this.transformTopCanvas()
        this.onRenderTopCanvas.dispatch(this.topCtx)
        StageScene.widgetRoot.children.forEach((elem) => elem.traverseDraw())
      })
      resetCtx()
    })
  }

  private fullRenderElemsMinHeap: TinyQueue<{
    elem: Elem
    selfIndex: number
    layerIndex: number
  }> = new TinyQueue()

  private calcFullRenderElemsMinHeap() {
    this.fullRenderElemsMinHeap = new TinyQueue(undefined, (a, b) => {
      if (a.layerIndex !== b.layerIndex) return a.layerIndex - b.layerIndex
      const aDistance = XY.center(AABB.rect(a.elem.aabb)).minus(
        this.eventXY || XY._(0, 0),
      )
      const bDistance = XY.center(AABB.rect(b.elem.aabb)).minus(
        this.eventXY || XY._(0, 0),
      )
      const aLane = max(abs(aDistance.x), abs(aDistance.y))
      const bLane = max(abs(bDistance.x), abs(bDistance.y))
      return aLane - bLane
      // return aDistance - bDistance
      // return a.selfIndex - b.selfIndex
    })

    StageScene.sceneRoot.children.forEach((elem, selfIndex) => {
      if (!elem.visible) return
      this.fullRenderElemsMinHeap.push({ elem, selfIndex, layerIndex: 0 })
    })
  }

  private fullRender = () => {
    this.transformCanvas()

    if (!getEditorSetting().needSliceRender || getEditorSetting().showDirtyRect) {
      StageScene.sceneRoot.children.forEach((elem) => elem.traverseDraw())
      return
    }

    if (!this.fullRenderElemsMinHeap.length) return

    const startTime = getTime()
    while (getTime() - startTime <= 15) {
      const elem = this.fullRenderElemsMinHeap.pop()?.elem
      elem?.traverseDraw()
    }

    this.requestRender('nextFullRender')
  }

  private patchRender = (reRenderElems: Set<Elem>) => {
    this.transformCanvas()

    StageScene.sceneRoot.children.forEach((elem) => {
      reRenderElems.has(elem) && elem.traverseDraw()
    })
  }

  private accumulatedErrorX = 0
  private accumulatedErrorY = 0

  private translate = (cur: IXY, prev: IXY) => {
    if (this.renderType) return

    const { width, height } = this.canvas
    const delta = XY.from(cur).minus(prev)
    const reRenderElems = new Set<Elem>()

    const traverse = (elem: Elem) => {
      if (!elem.visible) return
      if (AABB.include(StageViewport.prevSceneAABB, elem.aabb) === 1) return
      reRenderElems.add(elem)
    }

    const idealX = delta.x * dpr + this.accumulatedErrorX
    const idealY = delta.y * dpr + this.accumulatedErrorY

    const actualX = round(idealX)
    const actualY = round(idealY)

    this.accumulatedErrorX = idealX - actualX
    this.accumulatedErrorY = idealY - actualY

    this.bufferCtx.clearRect(0, 0, width, height)
    this.bufferCtx.drawImage(
      this.canvas,
      0,
      0,
      width,
      height,
      actualX,
      actualY,
      width,
      height,
    )

    this.ctx.clearRect(0, 0, width, height)
    this.ctx.drawImage(this.bufferCanvas, 0, 0, width, height, 0, 0, width, height)

    StageScene.sceneRoot.children.forEach(traverse)
    this.ctxSaveRestore(() => this.patchRender(reRenderElems))
  }

  private dirtyRects = new Set<AABB>()

  collectDirty = (elem: Elem) => {
    const dirtyRect = elem.getDirtyRect()
    if (dirtyRect) {
      if (elem.type === 'widgetElem') {
        this.requestRenderTopCanvas()
      } else {
        this.dirtyRects.add(dirtyRect)
        this.requestRender('partialRender')
      }
    }
  }

  private partialRender = () => {
    const reRenderElems = new Set<Elem>()
    let dirtyArea = AABB.merge(this.dirtyRects)
    let needReTest = true

    const traverse = (elem: Elem) => {
      if (!elem.visible) return
      if (!AABB.collide(dirtyArea, elem.aabb)) return

      if (AABB.include(dirtyArea, elem.aabb) !== 1) {
        dirtyArea = AABB.merge([dirtyArea, elem.aabb])
        needReTest = true
      }
      reRenderElems.add(elem)
      elem.children.forEach(traverse)
    }

    while (needReTest) {
      needReTest = false
      reRenderElems.clear()
      StageScene.rootElems.forEach((elem) => elem.children.forEach(traverse))
    }

    this.ctxSaveRestore(() => {
      this.transformCanvas()
      const { minX, minY, maxX, maxY } = dirtyArea
      this.ctx.clearRect(minX, minY, maxX - minX, maxY - minY)
      this.dirtyRects.clear()
      this.devDirtyArea = dirtyArea
    })

    this.ctxSaveRestore(() => {
      this.patchRender(reRenderElems)
    })
  }

  private devDirtyArea?: AABB

  private devShowDirtyRect() {
    return this.onRenderTopCanvas.hook(() => {
      if (!getEditorSetting().showDirtyRect) return

      this.ctxSaveRestore((ctx) => {
        if (!this.devDirtyArea) return

        const path2d = new Path2D()
        const { minX, minY, maxX, maxY } = this.devDirtyArea
        path2d.rect(minX, minY, maxX - minX, maxY - minY)
        ctx.lineWidth = 1 / dpr / getZoom()
        ctx.strokeStyle = rgba(0, 255, 100, 1)
        ctx.stroke(path2d)
      })
    })
  }

  private dprMatrix = Matrix.of(dpr, 0, 0, dpr, 0, 0)

  transformCanvas = () => {
    this.ctx.transform(...this.dprMatrix.tuple())
    this.ctx.transform(...StageViewport.sceneMatrix.tuple())
  }

  transformTopCanvas = () => {
    this.topCtx.transform(...this.dprMatrix.tuple())
    this.topCtx.transform(...StageViewport.sceneMatrix.tuple())
  }

  private onZoomMove = () => {
    return Disposer.collect(
      reaction(
        () => StageViewport.zoom,
        () => {
          this.requestRender('firstFullRender')
          this.requestRenderTopCanvas()
        },
      ),
      reaction(
        () => XY.from(StageViewport.offset),
        (offset, prevOffset) => {
          this.translate(offset, prevOffset)
          this.requestRenderTopCanvas()
        },
      ),
    )
  }

  private onResize() {
    return Disposer.collect(
      reaction(
        () => ({ ...StageViewport.bound }),
        ({ width, height }) => {
          ;[this.canvas, this.topCanvas, this.bufferCanvas].forEach((canvas) => {
            canvas.width = width * dpr
            canvas.height = height * dpr
            if (!(canvas instanceof OffscreenCanvas)) {
              canvas.style.width = `${width}px`
              canvas.style.height = `${height}px`
            }
          })
        },
        { fireImmediately: true },
      ),
      reaction(
        () => ({ ...StageViewport.bound }),
        () => this.requestRender('firstFullRender'),
      ),
    )
  }

  testVisible = (aabb: AABB) => {
    return AABB.collide(aabb, StageViewport.sceneAABB)
  }

  getVisualSize = (aabb: AABB) => {
    const zoom = getZoom()
    return XY._((aabb.maxX - aabb.minX) * zoom, (aabb.maxY - aabb.minY) * zoom)
  }

  addEvent = <K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (this: HTMLDivElement, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions,
  ) => {
    if (this.inited.value) {
      this.container.addEventListener(type, listener, options)
    } else {
      this.inited.hook(() =>
        this.container.addEventListener(type, listener, options),
      )
    }
    return () => this.container?.removeEventListener(type, listener, options)
  }

  private eventXY!: IXY

  private getEventXY = (xy: IXY) => {
    xy = StageViewport.toCanvasXY(xy)
    this.eventXY = StageViewport.sceneMatrix.invertXY(xy)
    this.elemsFromPoint = []
  }

  private traverseLayerList = (
    func: (
      elem: Elem,
      capture: boolean,
      stopped: boolean,
      stopPropagation: NoopFunc,
      hitList?: Elem[],
      xy?: IXY,
    ) => any,
    noBubble?: boolean,
  ) => {
    let stopped = false
    const stopPropagation = () => (stopped = true)

    const traverse = (layerIndex: number, elem: Elem, hitList?: Elem[]) => {
      if (!elem.visible) return

      if (this.eventXY) {
        const xy = XY.from(this.eventXY)
          .rotate(elem.obb.xy, -elem.obb.rotation)
          .minus(elem.obb.xy)

        func(elem, true, stopped, stopPropagation, hitList!, xy)

        const subHitList: Elem[] = []
        reverseFor(elem.children, (elem) => traverse(layerIndex, elem, subHitList))
        this.elemsFromPoint.push(...subHitList)

        !noBubble && func(elem, false, stopped, stopPropagation, undefined, xy)
      } else {
        func(elem, true, stopped, stopPropagation)

        reverseFor(elem.children, (elem) => traverse(layerIndex, elem))
        !noBubble && func(elem, false, stopped, stopPropagation)
      }
    }

    reverseFor(StageScene.rootElems, (elem, i) => traverse(i, elem, []))
  }

  private elemsFromPoint: Elem[] = []

  getElemsFromPoint(e?: IXY) {
    if (!e) return this.elemsFromPoint

    this.getEventXY(e)
    this.traverseLayerList(
      (elem, capture, stopped, stopPropagation, hitList, xy) => {
        const hit = elem.hitTest(xy!)
        if (hit) hitList?.push(elem)
      },
    )

    return this.elemsFromPoint
  }

  private onPointerEvents = () => {
    const onMouseEvent = (e: MouseEvent) => {
      if (this.isPointerEventNone) return
      if (getEditorSetting().needSliceRender && this.fullRenderElemsMinHeap.length)
        return

      this.getEventXY(e)
      this.traverseLayerList(
        (elem, capture, stopped, stopPropagation, hitList, xy) => {
          const hit = elem.hitTest(xy!)
          if (hit) hitList?.push(elem)
          if (!stopped)
            elem.eventHandle.triggerMouseEvent(e, xy!, hit, capture, stopPropagation)
        },
      )
    }

    return Disposer.collect(
      this.addEvent('mousedown', onMouseEvent, { capture: true }),
      this.addEvent('mousemove', onMouseEvent, { capture: true }),
    )
  }

  private isPointerEventNone = false

  disablePointEvent(setbackOnPointerUp = true) {
    this.isPointerEventNone = true
    if (setbackOnPointerUp) {
      return listen('mouseup', { once: true }, this.enablePointEvent)
    }
    return this.enablePointEvent
  }

  enablePointEvent() {
    this.isPointerEventNone = false
  }
}

export const StageSurface = autoBind(new StageSurfaceService())
