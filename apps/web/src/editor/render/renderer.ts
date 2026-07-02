import { AABB } from '@gitborlando/geo'
import { Signal } from '@gitborlando/signal'
import { Disposer } from '@gitborlando/toolkit/disposer'
import { createTraverser } from '@gitborlando/toolkit/traverser'
import type { NoopFunc } from '@gitborlando/utils'
import { EditorSettingService } from 'src/editor/core/setting'
import { max } from 'src/editor/geometry'
import { abs, round } from 'src/editor/geometry/base'
import { ElemDrawerService } from 'src/editor/render/drawer'
import { Elem } from 'src/editor/render/elem'
import { RenderInvalidatorService } from 'src/editor/render/invalidator'
import { RenderSurfaceService } from 'src/editor/render/surface'
import { RenderTreeService } from 'src/editor/render/tree'
import { StageViewportService } from 'src/editor/stage/viewport'
import { Raf } from 'src/editor/utils/misc'
import { Service } from 'src/global/service'
import { rgba } from 'src/utils/color'
import TinyQueue from 'tinyqueue'

const dpr = devicePixelRatio

export type SurfaceRenderType =
  | 'firstFullRender'
  | 'nextFullRender'
  | 'partialRender'

export class RendererService extends Service {
  onRenderTopCanvas = Signal.create<CanvasRenderingContext2D>()

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
  private dirtyRects = new Set<AABB>()
  private DEV_dirtyArea?: AABB
  private renderPriorityXY = XY.$(0, 0)
  private accumulatedErrorX = 0
  private accumulatedErrorY = 0

  constructor(
    private readonly editorSetting: EditorSettingService,
    private readonly renderTree: RenderTreeService,
    private readonly renderSurface: RenderSurfaceService,
    private readonly stageViewport: StageViewportService,
    private readonly elemDrawer: ElemDrawerService,
    private readonly renderInvalidator: RenderInvalidatorService,
  ) {
    super()
    autoBind(this)
  }

  get isSliceRendering() {
    return (
      this.editorSetting.setting.needSliceRender &&
      this.fullRenderElemsMinHeap.length > 0
    )
  }

  onCanvasInited() {
    this.effect(
      this.renderInvalidator.dirty$.hook(this.onDirty),
      this.onViewportChange(),
      this.DEV_showDirtyRect(),
    )
    this.stageViewport.onWheelZoom(this.renderSurface)
    this.requestRenderTopCanvas()
  }

  requestFirstFullRender() {
    this.requestRender('firstFullRender')
  }

  requestTopCanvasRender() {
    this.requestRenderTopCanvas()
  }

  updateRenderPriorityXY(xy: IXY) {
    this.renderPriorityXY = XY.of(xy)
  }

  isElemVisible(elem: Elem) {
    return elem.getVisible(this.stageViewport.sceneAABB)
  }

  private onDirty() {
    const dirtyRects = this.renderInvalidator.takeDirtyRects()
    const hasWidgetDirty = this.renderInvalidator.takeWidgetDirty()

    dirtyRects.forEach((dirtyRect) => this.dirtyRects.add(dirtyRect))

    if (dirtyRects.size) this.requestRender('partialRender')
    if (hasWidgetDirty) this.requestRenderTopCanvas()
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
        { fireImmediately: true },
      ),
    )
  }

  private requestRender(type: SurfaceRenderType) {
    if (this.renderType === type) return
    this.renderType = type

    if (type !== 'partialRender') this.dirtyRects.clear()
    if (type === 'partialRender' && this.renderTasks.length) return

    if (type === 'firstFullRender') this.calcFullRenderElemsMinHeap()
    if (type !== 'nextFullRender') this.renderTasks.length = 0

    this.renderTasks.push(() => {
      if (type === 'firstFullRender' || this.editorSetting.setting.fullRender) {
        this.renderSurface.clearSurface()
      }
      const isPartialRender =
        type === 'partialRender' && !this.editorSetting.setting.fullRender
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
        this.onRenderTopCanvas.dispatch(ctx)
        this.renderTree.widgetRoot.children.forEach(this.drawElem)
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
    if (!this.isElemVisible(elem)) return

    if (this.editorSetting.setting.ignoreUnVisible && elem.optimize) {
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
        resetTransform = this.renderSurface.setTransform(elem.node.matrix)
        this.renderSurface.ctxSaveRestore(() =>
          this.elemDrawer.draw(elem, ctx, path2d),
        )
      }

      if (elem.children.length) {
        if (elem.clip) ctx.clip(path2d)
        elem.children.forEach(this.drawElem)
      }

      resetTransform()
    })

    resetCtx()
  }

  private fullRender() {
    this.renderSurface.transformCanvas()

    if (!this.editorSetting.setting.needSliceRender) {
      this.renderTree.sceneRoot.children.forEach(this.drawElem)
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

  private patchRender(reRenderElems: Set<Elem>) {
    this.renderSurface.transformCanvas()

    this.renderTree.sceneRoot.children.forEach((elem) => {
      if (reRenderElems.has(elem)) this.drawElem(elem)
    })
  }

  private translate(cur: IXY, prev: IXY) {
    if (this.renderType) return

    const { width, height } = this.bufferCanvas
    const delta = XY.of(cur).minus(prev)
    const reRenderElems = new Set<Elem>()

    const traverse = (elem: Elem) => {
      if (!this.isElemVisible(elem)) return
      if (AABB.include(this.stageViewport.prevSceneAABB, elem.aabb) === 1) return
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
    this.renderSurface.ctxSaveRestore(() => this.patchRender(reRenderElems))
  }

  private partialRender() {
    if (this.dirtyRects.size === 0) return

    const reRenderElems = new Set<Elem>()
    let dirtyArea = AABB.merge(this.dirtyRects)
    let needReTest = true

    const traverser = createTraverser<Elem>({
      enter: (elem) => {
        if (!this.isElemVisible(elem)) return false
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
      traverser.traverse(this.renderTree.sceneElems)
    }

    this.renderSurface.ctxSaveRestore(() => {
      this.renderSurface.transformCanvas()
      const { minX, minY, maxX, maxY } = dirtyArea
      this.renderSurface.getMainCtx().clearRect(minX, minY, maxX - minX, maxY - minY)
      this.dirtyRects.clear()
      this.DEV_dirtyArea = dirtyArea
    })

    this.renderSurface.ctxSaveRestore(() => this.patchRender(reRenderElems))
  }

  private DEV_showDirtyRect() {
    return this.onRenderTopCanvas.hook((ctx) => {
      if (!this.editorSetting.setting.showDirtyRect) return
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
