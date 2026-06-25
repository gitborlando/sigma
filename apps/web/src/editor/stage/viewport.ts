import { AABB, IRect } from '@gitborlando/geo'
import { Wheeler } from '@gitborlando/toolkit/browser'
import { Disposer } from '@gitborlando/toolkit/disposer'
import { getSet } from '@gitborlando/utils'
import { listen } from '@gitborlando/utils/browser'
import { clamp } from 'es-toolkit'
import { Matrix, max, min } from 'src/editor/geometry'
import {
  HandlePage,
  HandleSelect,
  StageScene,
  StageSurface,
  StageViewport,
} from '..'
import { getSelectIdList } from '../utils/get'

const createInitBound = () => ({
  left: 240,
  top: 48,
  right: 240,
  bottom: 0,
  width: window.innerWidth - 240 - 240,
  height: window.innerHeight - 48 - 0,
})

export class StageViewportService {
  @observable.ref sceneMatrix = Matrix.identity()
  @observable bound = createInitBound()

  @observable zoom = 1
  @observable offset = XY.$(0, 0)
  @observable isZooming = false

  sceneAABB = new AABB(0, 0, 0, 0)
  prevSceneAABB = new AABB(0, 0, 0, 0)

  private prevSceneMatrix = Matrix.identity()
  private boundAABB = new AABB(0, 0, 0, 0)
  private wheeler = new Wheeler()
  private disposer = new Disposer()

  get boundCenter() {
    return XY.center(this.bound).divide(this.zoom)
  }

  subscribe() {
    return Disposer.combine(
      this.onBoundChange(),
      this.onMatrixChange(),
      this.onCurrentPageChange(),
      StageSurface.inited.hook(this.onWheelZoom),
      this.disposer.dispose,
    )
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

  private limitZoom(zoom: number) {
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

  private onWheelZoom() {
    this.disposer.add(
      this.wheeler.beforeWheel.hook(() => (this.isZooming = true)),
      this.wheeler.duringWheel.hook(({ e }) => this.handleWheelZoom(e)),
      this.wheeler.afterWheel.hook(() => (this.isZooming = false)),
      StageSurface.addEvent('wheel', (e) => this.wheeler.onWheel(e as WheelEvent)),
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
      () => HandleSelect.selectPageId,
      (pageId) => {
        const getMatrix = () => Matrix.identity()
        const matrix = getSet(HandlePage.pageSceneMatrix, pageId, getMatrix)
        StageViewport.sceneMatrix = Matrix.of(matrix)
      },
    )
  }

  handleZoomToFitAll() {
    this.zoomToFit(StageScene.sceneElems.map((elem) => elem.aabb))
  }

  handleZoomToFitSelection() {
    this.zoomToFit(getSelectIdList().map((id) => StageScene.findElem(id).aabb))
  }

  private zoomToFit(aabbList: AABB[]) {
    if (!aabbList.length) return

    let aabb = AABB.merge(aabbList)
    let rect = AABB.rect(aabb)

    aabb = AABB.extend(aabb, max(rect.width / 10, rect.height / 10))
    rect = AABB.rect(aabb)

    const zoom = this.limitZoom(
      min(this.bound.width / rect.width, this.bound.height / rect.height),
    )
    const offset = XY.center(rect).plus(rect).minus(this.boundCenter)

    runInAction(() => {
      this.sceneMatrix = Matrix.identity().shift(offset.multiplyNum(-1))
      this.updateZoom(zoom, this.boundCenter)
    })
  }
}
