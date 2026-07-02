import { AABB, IRect } from '@gitborlando/geo'
import { Wheeler } from '@gitborlando/toolkit/browser'
import { getSet } from '@gitborlando/utils'
import { listen } from '@gitborlando/utils/browser'
import { clamp } from 'es-toolkit'
import { makeObservable } from 'mobx'
import { IMatrix, Matrix } from 'src/editor/geometry'
import { HandleSelectService } from 'src/editor/handle/select'
import { RenderSurfaceService } from 'src/editor/render/surface'
import { Service } from 'src/global/service'

const createInitBound = () => ({
  left: 240,
  top: 48,
  right: 240,
  bottom: 0,
  width: window.innerWidth - 240 - 240,
  height: window.innerHeight - 48 - 0,
})

export class StageViewportService extends Service {
  @observable.ref sceneMatrix = Matrix.identity()
  @observable bound = createInitBound()

  @observable zoom = 1
  @observable offset = XY.$(0, 0)
  @observable isZooming = false

  sceneAABB = new AABB(0, 0, 0, 0)
  prevSceneAABB = new AABB(0, 0, 0, 0)
  pageSceneMatrix = new Map<ID, IMatrix>()

  private prevSceneMatrix = Matrix.identity()
  private boundAABB = new AABB(0, 0, 0, 0)
  private wheeler = new Wheeler()

  constructor(private readonly handleSelect: HandleSelectService) {
    super()
    autoBind(makeObservable(this))
    this.effect(this.onBoundChange())
    this.effect(this.onMatrixChange())
    this.effect(this.onCurrentPageChange())
  }

  get boundCenter() {
    return XY.center(this.bound).divide(this.zoom)
  }

  toCanvasXY(xy: IXY) {
    return XY.of(xy).minus(XY.leftTop(this.bound))
  }

  toStageXY(xy: IXY) {
    return XY.of(this.toCanvasXY(xy)).minus(this.offset)
  }

  toSceneXY(xy: IXY) {
    return XY.of(this.toStageXY(xy)).divide(this.zoom)
  }

  toSceneShift(xy: IXY) {
    return XY.of(xy).divide(this.zoom)
  }

  toSceneMarquee(marquee: IRect) {
    return {
      ...this.toSceneXY(marquee),
      width: marquee.width / this.zoom,
      height: marquee.height / this.zoom,
    }
  }

  sceneXYToClientXY(xy: IXY) {
    return XY.of(xy)
      .multiply(this.zoom)
      .plus(this.offset)
      .plus(XY.leftTop(this.bound))
  }

  inViewport(xy: IXY) {
    const { left, top, right, bottom } = this.bound
    return xy.x > left && xy.x < right && xy.y > top && xy.y < bottom
  }

  getStepByZoom(zoom: number) {
    const steps = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]
    const base = 50 / zoom
    return steps.find((i) => i >= base) || steps[0]
  }

  updateZoom(newZoom: number, center?: IXY) {
    const deltaZoom = this.limitZoom(newZoom) / this.zoom
    center ||= XY.center(this.bound)

    this.sceneMatrix = Matrix.of(this.sceneMatrix)
      .translate(-center.x, -center.y)
      .scale(deltaZoom, deltaZoom)
      .translate(center.x, center.y)
  }

  limitZoom(zoom: number) {
    return clamp(zoom, 0.015625, 256)
  }

  private deltaYToZoomStep(deltaY: number) {
    return Math.max(0.05, 0.12937973 * Math.log(Math.abs(deltaY)) - 0.33227472)
  }

  private handleWheelZoom = (e: WheelEvent) => {
    e.preventDefault()

    if (!e.ctrlKey) {
      const shift = e.shiftKey
        ? XY.$(e.deltaY, 0)
        : e.deltaY === 0
          ? XY.$(-e.deltaX, 0)
          : XY.$(0, -e.deltaY)
      this.sceneMatrix = Matrix.of(this.sceneMatrix).shift(shift)
      return
    }

    const sign = Math.sign(e.deltaY)
    const step = this.deltaYToZoomStep(e.deltaY)
    const newZoom = this.zoom / (1 + step) ** sign

    this.updateZoom(newZoom, this.toCanvasXY(XY.client(e)))
  }

  onWheelZoom(renderSurface: RenderSurfaceService) {
    this.effect(
      this.wheeler.beforeWheel.hook(() => (this.isZooming = true)),
      this.wheeler.duringWheel.hook(({ e }) => this.handleWheelZoom(e)),
      this.wheeler.afterWheel.hook(() => (this.isZooming = false)),
      renderSurface.addEvent('wheel', (e) => this.wheeler.onWheel(e as WheelEvent)),
      listen('wheel', { passive: false, capture: true }, (e) => {
        e.ctrlKey && e.preventDefault()
      }),
    )
  }

  private onMatrixChange() {
    return reaction(
      () => this.sceneMatrix,
      (_, prev) => {
        this.prevSceneMatrix = prev
        this.zoom = this.sceneMatrix.a
        this.offset = XY.from(this.sceneMatrix.tx, this.sceneMatrix.ty)
        this.sceneAABB = this.sceneMatrix.invertAABB(this.boundAABB)
        this.prevSceneAABB = this.prevSceneMatrix.invertAABB(this.boundAABB)
        this.pageSceneMatrix.set(
          this.handleSelect.selectPageId,
          Matrix.of(this.sceneMatrix),
        )
      },
    )
  }

  private onBoundChange() {
    const setBound = action(() => {
      const { left, top, right, bottom } = this.bound
      this.bound.width = window.innerWidth - left - right
      this.bound.height = window.innerHeight - top - bottom
      this.boundAABB = new AABB(0, 0, this.bound.width, this.bound.height)
    })
    setBound()
    return listen('resize', setBound)
  }

  private onCurrentPageChange() {
    return reaction(
      () => this.handleSelect.selectPageId,
      (pageId) => {
        const getMatrix = () => Matrix.identity()
        const matrix = getSet(this.pageSceneMatrix, pageId, getMatrix)
        this.sceneMatrix = Matrix.of(matrix)
      },
    )
  }
}
