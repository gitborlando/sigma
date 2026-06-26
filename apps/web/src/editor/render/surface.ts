import { AABB } from '@gitborlando/geo'
import { Signal } from '@gitborlando/signal'
import { Disposer } from '@gitborlando/toolkit/disposer'
import { createTraverser } from '@gitborlando/toolkit/traverser'
import type { NoopFunc } from '@gitborlando/utils'
import { listen } from '@gitborlando/utils/browser'
import { Matrix, max } from 'src/editor/geometry'
import { abs, round } from 'src/editor/geometry/base'
import { IMatrix } from 'src/editor/geometry/matrix'
import {
  TextBreaker,
  createTextBreaker,
} from 'src/editor/render/text-break/text-breaker'
import { EditorService } from 'src/editor/service'
import { Raf, reverseFor } from 'src/editor/utils/misc'
import { rgba } from 'src/utils/color'
import TinyQueue from 'tinyqueue'
import { getSetting, getZoom } from '../utils/get'
import { Elem } from './elem'

const dpr = devicePixelRatio

export type SurfaceCanvasType = 'mainCanvas' | 'topCanvas'

export type SurfaceRenderType =
  | 'firstFullRender'
  | 'nextFullRender'
  | 'partialRender'

export class StageSurfaceService extends EditorService {
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

  subscribe() {
    return Disposer.combine(
      this.inited.hook(() => {
        this.disposer.add(this.onResize(), this.onZoomMove(), this.onPointerEvents())
        this.requestRenderTopCanvas()
      }),
      this.DEV_showDirtyRect(),
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

  setTransform = (transform: IMatrix) => {
    const matrix = Matrix.of(transform)
    this.currentCtx.transform(...matrix.tuple())
    return () => this.currentCtx.transform(...matrix.invert().tuple())
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
      if (type === 'firstFullRender' || getSetting(this.editor).fullRender)
        this.clearSurface()
      const isPartialRender =
        type === 'partialRender' && !getSetting(this.editor).fullRender
      isPartialRender ? this.partialRender() : this.fullRender()
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
        this.editor.stageScene.widgetRoot.children.forEach((elem) =>
          elem.traverseDraw(),
        )
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
        this.eventXY || XY.$(0, 0),
      )
      const bDistance = XY.center(AABB.rect(b.elem.aabb)).minus(
        this.eventXY || XY.$(0, 0),
      )
      const aLane = max(abs(aDistance.x), abs(aDistance.y))
      const bLane = max(abs(bDistance.x), abs(bDistance.y))
      return aLane - bLane
      // return aDistance - bDistance
      // return a.selfIndex - b.selfIndex
    })

    this.editor.stageScene.sceneRoot.children.forEach((elem, selfIndex) => {
      if (!elem.visible) return
      this.fullRenderElemsMinHeap.push({ elem, selfIndex, layerIndex: 0 })
    })
  }

  private fullRender = () => {
    this.transformCanvas()

    if (
      !getSetting(this.editor)
        .needSliceRender /*  || getEditorSetting().showDirtyRect */
    ) {
      this.editor.stageScene.sceneRoot.children.forEach((elem) =>
        elem.traverseDraw(),
      )
      while (this.fullRenderElemsMinHeap.length) this.fullRenderElemsMinHeap.pop()
      return
    }

    if (!this.fullRenderElemsMinHeap.length) return

    const startTime = performance.now()
    while (performance.now() - startTime <= 15) {
      const elem = this.fullRenderElemsMinHeap.pop()?.elem
      elem?.traverseDraw()
    }

    if (this.fullRenderElemsMinHeap.length) this.requestRender('nextFullRender')
  }

  private patchRender = (reRenderElems: Set<Elem>) => {
    this.transformCanvas()

    this.editor.stageScene.sceneRoot.children.forEach((elem) => {
      reRenderElems.has(elem) && elem.traverseDraw()
    })
  }

  private accumulatedErrorX = 0
  private accumulatedErrorY = 0

  private translate = (cur: IXY, prev: IXY) => {
    if (this.renderType) return

    const { width, height } = this.canvas
    const delta = XY.of(cur).minus(prev)
    const reRenderElems = new Set<Elem>()

    const traverse = (elem: Elem) => {
      if (!elem.visible) return
      if (AABB.include(this.editor.stageViewport.prevSceneAABB, elem.aabb) === 1)
        return
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

    this.editor.stageScene.sceneRoot.children.forEach(traverse)
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

    const traverser = createTraverser<Elem>({
      enter: (elem) => {
        if (!elem.visible) return false
        if (!AABB.collide(dirtyArea, elem.aabb)) return false

        if (AABB.include(dirtyArea, elem.aabb) !== 1) {
          dirtyArea = AABB.merge([dirtyArea, elem.aabb])
          needReTest = true
        }
        reRenderElems.add(elem)
      },
    })

    while (needReTest) {
      needReTest = false
      reRenderElems.clear()
      traverser.traverse(this.editor.stageScene.sceneElems)
    }

    this.ctxSaveRestore(() => {
      this.transformCanvas()
      const { minX, minY, maxX, maxY } = dirtyArea
      this.ctx.clearRect(minX, minY, maxX - minX, maxY - minY)
      this.dirtyRects.clear()
      this.DEV_dirtyArea = dirtyArea
    })

    this.ctxSaveRestore(() => {
      this.patchRender(reRenderElems)
    })
  }

  private DEV_dirtyArea?: AABB

  private DEV_showDirtyRect() {
    return this.onRenderTopCanvas.hook(() => {
      if (!getSetting(this.editor).showDirtyRect) return

      this.ctxSaveRestore((ctx) => {
        if (!this.DEV_dirtyArea) return

        const path2d = new Path2D()
        const { minX, minY, maxX, maxY } = this.DEV_dirtyArea
        path2d.rect(minX, minY, maxX - minX, maxY - minY)
        ctx.lineWidth = 2 / getZoom(this.editor)
        ctx.strokeStyle = rgba(0, 255, 100, 1)
        ctx.stroke(path2d)
      })
    })
  }

  private dprMatrix = Matrix.identity().scale(dpr, dpr)

  transformCanvas = () => {
    this.ctx.transform(...this.dprMatrix.tuple())
    this.ctx.transform(...this.editor.stageViewport.sceneMatrix.tuple())
  }

  transformTopCanvas = () => {
    this.topCtx.transform(...this.dprMatrix.tuple())
    this.topCtx.transform(...this.editor.stageViewport.sceneMatrix.tuple())
  }

  private onZoomMove = () => {
    return Disposer.combine(
      reaction(
        () => this.editor.stageViewport.zoom,
        () => {
          this.requestRender('firstFullRender')
          this.requestRenderTopCanvas()
        },
      ),
      reaction(
        () => XY.of(this.editor.stageViewport.offset),
        (offset, prevOffset) => {
          this.translate(offset, prevOffset)
          this.requestRenderTopCanvas()
        },
      ),
    )
  }

  private onResize() {
    return Disposer.combine(
      reaction(
        () => ({ ...this.editor.stageViewport.bound }),
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
        () => ({ ...this.editor.stageViewport.bound }),
        () => this.requestRender('firstFullRender'),
      ),
    )
  }

  getVisualSize = (aabb: AABB) => {
    const zoom = getZoom(this.editor)
    return XY.$((aabb.maxX - aabb.minX) * zoom, (aabb.maxY - aabb.minY) * zoom)
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
    xy = this.editor.stageViewport.toCanvasXY(xy)
    this.eventXY = this.editor.stageViewport.sceneMatrix.invertXY(xy)
    this.elemsFromPoint = []
  }

  private traverseLayerList = (
    func: (props: {
      elem: Elem
      capture: boolean
      stopped: boolean
      stopPropagation: NoopFunc
      hitList?: Elem[]
      xy?: IXY
    }) => any,
    noBubble?: boolean,
  ) => {
    let stopped = false
    const stopPropagation = () => (stopped = true)

    const traverse = (props: {
      layerIndex: number
      elem: Elem
      hitList?: Elem[]
      xy?: IXY
    }) => {
      const { layerIndex, elem, hitList } = props
      let xy = props.xy
      if (!elem.visible) return

      if (xy) {
        if (elem.node?.matrix) {
          xy = Matrix.of(elem.node.matrix).invertXY(xy)
        }

        func({ elem, capture: true, stopped, stopPropagation, hitList, xy })

        const subHitList: Elem[] = []
        reverseFor(elem.children, (elem) =>
          traverse({ layerIndex, elem, hitList: subHitList, xy }),
        )
        this.elemsFromPoint.push(...subHitList)

        !noBubble &&
          func({ elem, capture: false, stopped, stopPropagation, hitList, xy })
      } else {
        func({ elem, capture: true, stopped, stopPropagation })

        reverseFor(elem.children, (elem) => traverse({ layerIndex, elem }))

        !noBubble && func({ elem, capture: false, stopped, stopPropagation })
      }
    }

    reverseFor(this.editor.stageScene.rootElems, (elem, layerIndex) =>
      traverse({ layerIndex, elem, xy: this.eventXY, hitList: [] }),
    )
  }

  private elemsFromPoint: Elem[] = []

  getElemsFromPoint(e?: IXY) {
    if (!e) return this.elemsFromPoint
    if (this.elemsFromPoint.length) return this.elemsFromPoint

    this.getEventXY(e)
    this.traverseLayerList(({ elem, hitList, xy }) => {
      if (elem.hitTest(xy!)) hitList?.push(elem)
    })

    return this.elemsFromPoint
  }

  private onPointerEvents = () => {
    const onMouseEvent = (e: MouseEvent) => {
      if (this.isPointerEventNone) return
      if (
        getSetting(this.editor).needSliceRender &&
        this.fullRenderElemsMinHeap.length
      )
        return

      this.getEventXY(e)
      this.elemsFromPoint.length = 0
      this.traverseLayerList(
        ({ elem, capture, stopped, stopPropagation, hitList, xy }) => {
          const hit = elem.hitTest(xy!)
          if (hit) hitList?.push(elem)
          if (!stopped)
            elem.eventHandle.triggerMouseEvent(e, xy!, hit, capture, stopPropagation)
        },
      )
    }

    return Disposer.combine(
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
