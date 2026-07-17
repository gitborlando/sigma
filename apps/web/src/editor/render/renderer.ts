import { AABB } from '@gitborlando/geo'
import { Signal } from '@gitborlando/signal'
import { Disposer } from '@gitborlando/toolkit/disposer'
import { createTraverser } from '@gitborlando/toolkit/traverser'
import type { NoopFunc } from '@gitborlando/utils'
import { untracked } from 'mobx'
import { Setting } from 'src/editor/core/setting'
import { max } from 'src/editor/geometry'
import { abs, round } from 'src/editor/geometry/base'
import { ElemDrawer } from 'src/editor/render/drawer'
import { Elem } from 'src/editor/render/elem'
import { RenderSurface } from 'src/editor/render/surface'
import { RenderTree, type RenderDirtyType } from 'src/editor/render/tree'
import { StageViewport } from 'src/editor/stage/viewport'
import { Raf } from 'src/editor/utils/misc'
import { Service } from 'src/global/service'
import { rgba } from 'src/utils/color'
import TinyQueue from 'tinyqueue'

const dpr = devicePixelRatio

export type SurfaceRenderType =
  | 'firstFullRender'
  | 'nextFullRender'
  | 'partialRender'

@reflection
export class Renderer extends Service {
  renderTopCanvas$ = Signal.create<CanvasRenderingContext2D>()

  private bufferCanvas = new OffscreenCanvas(0, 0)
  private bufferCtx = this.bufferCanvas.getContext('2d')!

  private renderType?: SurfaceRenderType
  private renderTasks: NoopFunc[] = []
  private raf = new Raf()

  private hasRequestedRenderTopCanvas = false

  private fullRenderElemsMinHeap: TinyQueue<{
    elem: Elem
    selfIndex: number
    layerIndex: number
  }> = new TinyQueue()

  private elemLatestPaintRectMap?: Map<Elem, AABB>
  private DEV_dirtyArea?: AABB

  private renderPriorityXY = XY.$(0, 0)

  private accumulatedErrorX = 0
  private accumulatedErrorY = 0

  constructor(
    private readonly setting: Setting,
    private readonly renderTree: RenderTree,
    private readonly renderSurface: RenderSurface,
    private readonly stageViewport: StageViewport,
    private readonly elemDrawer: ElemDrawer,
  ) {
    super()
    autoBind(this)
  }

  get isSliceRendering() {
    return this.setting.needSliceRender && this.fullRenderElemsMinHeap.length > 0
  }

  onCanvasInited() {
    this.effect(this.renderTree.hasDirty$.hook(this.onDirty))
    this.effect(this.onViewportChange())
    this.effect(this.DEV_showDirtyRect())
    this.stageViewport.onWheelZoom(this.renderSurface)
    this.requestRenderTopCanvas()
  }

  updateRenderPriorityXY(xy: IXY) {
    this.renderPriorityXY = XY.of(xy)
  }

  isElemVisible(elem: Elem, latestPaintRect?: AABB) {
    return elem.getVisible(
      untracked(() => this.stageViewport.sceneAABB),
      latestPaintRect,
    )
  }

  private onDirty(type: RenderDirtyType) {
    if (type === 'scene') {
      this.requestRender('partialRender')
    } else {
      this.requestRenderTopCanvas()
    }
  }

  private onViewportChange() {
    return Disposer.combine(
      reaction(
        () => this.stageViewport.zoom,
        () => {
          this.requestRender('firstFullRender')
          this.requestRenderTopCanvas()
        },
      ),
      reaction(
        () => XY.of(this.stageViewport.offset),
        (offset, prevOffset) => {
          this.translate(offset, prevOffset)
          this.requestRenderTopCanvas()
        },
      ),
      reaction(
        () => ({ ...this.stageViewport.bound }),
        ({ width, height }) => {
          this.bufferCanvas.width = width * dpr
          this.bufferCanvas.height = height * dpr
          this.requestRender('firstFullRender')
          this.requestRenderTopCanvas()
        },
      ),
    )
  }

  private requestRender(type: SurfaceRenderType) {
    if (this.renderType === type) return
    this.renderType = type

    if (type !== 'partialRender') this.renderTree.dirtyElems.clear()
    if (type === 'partialRender' && this.renderTasks.length) return

    if (type === 'firstFullRender') this.calcFullRenderElemsMinHeap()
    if (type !== 'nextFullRender') this.renderTasks.length = 0

    this.renderTasks.push(() => {
      if (type === 'firstFullRender' || this.setting.fullRender) {
        this.renderSurface.clearSurface()
      }
      const isPartialRender = type === 'partialRender' && !this.setting.fullRender
      isPartialRender ? this.partialRender() : this.fullRender()
    })

    this.raf.cancelAll().request((next) => {
      this.renderSurface.ctxSaveRestore(() => this.renderTasks.pop()?.())
      this.renderType = undefined
      if (this.renderTasks.length) next()
    })
  }

  private requestRenderTopCanvas() {
    if (this.hasRequestedRenderTopCanvas) return
    this.hasRequestedRenderTopCanvas = true

    requestAnimationFrame(() => {
      this.hasRequestedRenderTopCanvas = false

      const resetCtx = this.renderSurface.setCurrentCtxType('topCanvas')
      this.renderSurface.clearSurface()
      this.renderSurface.ctxSaveRestore((ctx) => {
        this.renderSurface.transformTopCanvas()
        this.renderTopCanvas$.dispatch(ctx)
        this.renderTree.widgetRoot.children.forEach((elem) => this.drawElem(elem))
      })
      resetCtx()
    })
  }

  private calcFullRenderElemsMinHeap() {
    this.fullRenderElemsMinHeap = new TinyQueue(undefined, (a, b) => {
      if (a.layerIndex !== b.layerIndex) return a.layerIndex - b.layerIndex

      const aDistance = XY.center(AABB.rect(a.elem.aabb)).minus(
        this.renderPriorityXY,
      )
      const bDistance = XY.center(AABB.rect(b.elem.aabb)).minus(
        this.renderPriorityXY,
      )
      const aLane = max(abs(aDistance.x), abs(aDistance.y))
      const bLane = max(abs(bDistance.x), abs(bDistance.y))
      return aLane - bLane
    })

    this.renderTree.sceneRoot.children.forEach((elem, selfIndex) => {
      if (!this.isElemVisible(elem)) return
      this.fullRenderElemsMinHeap.push({ elem, selfIndex, layerIndex: 0 })
    })
  }

  private drawElem(elem: Elem) {
    if (!this.isElemVisible(elem, this.elemLatestPaintRectMap?.get(elem))) return

    if (this.setting.ignoreUnVisible && elem.optimize) {
      const visualSize = this.renderSurface.getVisualSize(elem.aabb)
      if (visualSize.x < 2 && visualSize.y < 2) return
    }

    const resetCtx = this.renderSurface.setCurrentCtxType(
      elem.type === 'widgetElem' ? 'topCanvas' : 'mainCanvas',
    )

    this.renderSurface.ctxSaveRestore((ctx) => {
      const path2d = new Path2D()
      let resetTransform = () => {}

      if (elem.node) {
        resetTransform = this.renderSurface.setTransform(elem.renderMatrix)
        this.renderSurface.ctxSaveRestore(() => {
          this.elemDrawer.draw(elem, ctx, path2d)
        })
      }

      if (elem.children.length) {
        if (elem.clip) ctx.clip(path2d)
        elem.children.forEach((child) => this.drawElem(child))
      }

      resetTransform()
    })

    resetCtx()
  }

  private fullRender() {
    this.renderSurface.transformCanvas()

    if (!this.setting.needSliceRender) {
      this.renderTree.sceneRoot.children.forEach((elem) => this.drawElem(elem))
      while (this.fullRenderElemsMinHeap.length) this.fullRenderElemsMinHeap.pop()
      return
    }

    if (!this.fullRenderElemsMinHeap.length) return

    const startTime = performance.now()
    while (performance.now() - startTime <= 15) {
      const elem = this.fullRenderElemsMinHeap.pop()?.elem
      if (elem) this.drawElem(elem)
    }

    if (this.fullRenderElemsMinHeap.length) this.requestRender('nextFullRender')
  }

  private patchRender(rerenderElems: Set<Elem>) {
    this.renderSurface.transformCanvas()

    this.renderTree.sceneRoot.children.forEach((elem) => {
      if (rerenderElems.has(elem)) this.drawElem(elem)
    })
  }

  private translate(cur: IXY, prev: IXY) {
    if (this.renderType) return

    const { width, height } = this.bufferCanvas
    const delta = XY.of(cur).minus(prev)
    const rerenderElems = new Set<Elem>()

    const traverse = (elem: Elem) => {
      if (!this.isElemVisible(elem)) return
      if (AABB.include(this.stageViewport.prevSceneAABB, elem.aabb) === 1) return
      rerenderElems.add(elem)
    }

    const idealX = delta.x * dpr + this.accumulatedErrorX
    const idealY = delta.y * dpr + this.accumulatedErrorY
    const actualX = round(idealX)
    const actualY = round(idealY)

    this.accumulatedErrorX = idealX - actualX
    this.accumulatedErrorY = idealY - actualY

    this.bufferCtx.clearRect(0, 0, width, height)
    this.bufferCtx.drawImage(
      this.renderSurface.getCanvas(),
      0,
      0,
      width,
      height,
      actualX,
      actualY,
      width,
      height,
    )

    const ctx = this.renderSurface.getMainCtx()
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(this.bufferCanvas, 0, 0, width, height, 0, 0, width, height)

    this.renderTree.sceneRoot.children.forEach(traverse)
    this.renderSurface.ctxSaveRestore(() => this.patchRender(rerenderElems))
  }

  private partialRender() {
    if (this.renderTree.dirtyElems.size === 0) return

    this.elemLatestPaintRectMap = new Map<Elem, AABB>()
    const dirtyRects: AABB[] = []

    createTraverser<Elem, { visible?: boolean }>({
      enter: (elem) => {
        if (elem.lastPaintRect) dirtyRects.push(elem.lastPaintRect)
        if (elem.hidden) return false

        const latestPaintRect = this.elemDrawer.measurePaintRect(elem)
        this.elemLatestPaintRectMap?.set(elem, latestPaintRect)
        dirtyRects.push(latestPaintRect)
      },
    }).traverse([...this.renderTree.dirtyElems])

    this.renderTree.dirtyElems.clear()
    if (dirtyRects.length === 0) return

    const rerenderElems = new Set<Elem>()
    const antialiasPadding = 1 / (dpr * this.stageViewport.zoom)
    let dirtyArea = AABB.extend(AABB.merge(dirtyRects), antialiasPadding)
    let needRetest = true

    const traverser = createTraverser<Elem>({
      enter: (elem) => {
        const latestPaintRect =
          this.elemLatestPaintRectMap?.get(elem) ?? elem.estimatedPaintRect
        if (!this.isElemVisible(elem, latestPaintRect)) return false
        if (!AABB.collide(dirtyArea, latestPaintRect)) return false

        if (AABB.include(dirtyArea, latestPaintRect) !== 1) {
          dirtyArea = AABB.merge([dirtyArea, latestPaintRect])
          needRetest = true
        }
        rerenderElems.add(elem)
      },
    })

    while (needRetest) {
      needRetest = false
      rerenderElems.clear()
      traverser.traverse(this.renderTree.sceneElems)
    }

    this.renderSurface.ctxSaveRestore(() => {
      this.renderSurface.transformCanvas()
      const { minX, minY, maxX, maxY } = dirtyArea
      this.renderSurface.getMainCtx().clearRect(minX, minY, maxX - minX, maxY - minY)
      this.DEV_dirtyArea = dirtyArea
    })

    this.renderSurface.ctxSaveRestore(() => this.patchRender(rerenderElems))
    this.elemLatestPaintRectMap = undefined
  }

  private DEV_showDirtyRect() {
    return this.renderTopCanvas$.hook((ctx) => {
      if (!this.setting.showDirtyRect) return
      if (!this.DEV_dirtyArea) return

      ctx.save()

      const path2d = new Path2D()
      const { minX, minY, maxX, maxY } = this.DEV_dirtyArea
      path2d.rect(minX, minY, maxX - minX, maxY - minY)
      ctx.lineWidth = 2 / this.stageViewport.zoom
      ctx.strokeStyle = rgba(0, 255, 100, 1)
      ctx.stroke(path2d)

      ctx.restore()
    })
  }
}
