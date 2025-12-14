import { listen, WheelUtil } from '@gitborlando/utils/browser'
import { EditorSetting, getEditorSetting } from 'src/editor/editor/setting'
import { HandlePage } from 'src/editor/handle/page'
import { AABB, IRect } from 'src/editor/math'
import { minMax } from 'src/editor/math/base'
import { Matrix } from 'src/editor/math/matrix'
import { StageScene } from 'src/editor/render/scene'
import { StageSurface } from 'src/editor/render/surface'
import { getSelectIdList } from 'src/editor/y-state/y-clients'

const createInitBound = () => ({
  left: 240,
  top: 48,
  right: 240,
  bottom: 0,
  width: window.innerWidth - 240 - 240,
  height: window.innerHeight - 48 - 0,
})

class StageViewportService {
  @observable.ref sceneMatrix = Matrix.identity()
  @observable bound = createInitBound()

  @observable zoom = 1
  @observable offset = XY._(0, 0)
  @observable isZooming = false

  sceneAABB = new AABB(0, 0, 0, 0)
  prevSceneAABB = new AABB(0, 0, 0, 0)

  private prevSceneMatrix = Matrix.identity()
  private boundAABB = new AABB(0, 0, 0, 0)
  private wheeler = new WheelUtil()
  private disposer = new Disposer()

  subscribe() {
    return Disposer.collect(
      this.onBoundChange(),
      this.onMatrixChange(),
      this.onCurrentPageChange(),
      StageSurface.inited.hook(this.onWheelZoom),
      EditorSetting.inited.hook(this.DEV_loadSceneMatrix),
      this.disposer.dispose,
    )
  }

  init() {
    this.onObserving()
  }

  toCanvasXY(xy: IXY) {
    return XY.from(xy).minus(XY.leftTop(this.bound)).xy
  }
  toStageXY(xy: IXY) {
    return XY.from(this.toCanvasXY(xy)).minus(this.offset).xy
  }
  toSceneXY(xy: IXY) {
    return XY.from(this.toStageXY(xy)).divide(this.zoom).xy
  }
  toSceneShift(xy: IXY) {
    return XY.from(xy).divide(this.zoom).xy
  }
  toSceneMarquee(marquee: IRect) {
    return {
      ...this.toSceneXY(marquee),
      width: marquee.width / this.zoom,
      height: marquee.height / this.zoom,
    }
  }
  sceneXYToClientXY(xy: IXY) {
    return XY.from(xy)
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

    this.sceneMatrix = Matrix.from(this.sceneMatrix)
      .translate(-center.x, -center.y)
      .scale(deltaZoom, deltaZoom)
      .translate(center.x, center.y).matrix
  }

  private limitZoom(zoom: number) {
    return minMax(0.015625, 256, zoom)
  }

  private deltaYToZoomStep(deltaY: number) {
    return Math.max(0.05, 0.12937973 * Math.log(Math.abs(deltaY)) - 0.33227472)
  }

  private handleWheelZoom = (e: WheelEvent) => {
    e.preventDefault()

    if (!e.ctrlKey) {
      if (e.shiftKey) {
        this.sceneMatrix = Matrix.from(this.sceneMatrix).translate(
          e.deltaY,
          0,
        ).matrix
      } else {
        if (e.deltaY === 0)
          this.sceneMatrix = Matrix.from(this.sceneMatrix).translate(
            -e.deltaX,
            0,
          ).matrix
        else
          this.sceneMatrix = Matrix.from(this.sceneMatrix).translate(
            0,
            -e.deltaY,
          ).matrix
      }
      return
    }

    const sign = Math.sign(e.deltaY)
    const step = this.deltaYToZoomStep(e.deltaY)
    const newZoom = minMax(0.015625, 256, this.zoom / (1 + step) ** sign)

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
    return Disposer.collect(
      reaction(
        () => this.sceneMatrix,
        (_, prev) => (this.prevSceneMatrix = Matrix.from(prev).matrix),
      ),
      autorun(() => {
        this.zoom = this.sceneMatrix[0]
        this.offset = XY._(this.sceneMatrix[4], this.sceneMatrix[5])
        this.sceneAABB = Matrix.of(this.sceneMatrix).invertAABB(this.boundAABB)
        this.prevSceneAABB = Matrix.of(this.prevSceneMatrix).invertAABB(
          this.boundAABB,
        )
      }),
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

  private onObserving() {
    return Disposer.collect(
      autorun(() => {
        YClients.client.sceneMatrix = Matrix.clone(this.sceneMatrix)
      }),
      autorun(() => {
        const client = YClients.observingClient
        if (!client) return
      }),
    )
  }

  private onCurrentPageChange() {
    return reaction(
      () => YClients.client.selectPageId,
      (pageId) => {
        const getMatrix = () =>
          getEditorSetting().dev.sceneMatrix || Matrix.identity()
        const matrix = HandlePage.pageSceneMatrix.getSet(pageId, getMatrix)
        StageViewport.sceneMatrix = Matrix.clone(matrix)
      },
    )
  }

  @action
  private DEV_loadSceneMatrix() {
    const { fixedSceneMatrix, sceneMatrix } = getEditorSetting().dev
    if (fixedSceneMatrix) this.sceneMatrix = Matrix.clone(sceneMatrix)
  }

  handleZoomToFitAll() {
    this.zoomToFit(StageScene.sceneRoot.children.map((child) => child.aabb))
  }

  handleZoomToFitSelection() {
    this.zoomToFit(getSelectIdList().map((id) => StageScene.findElem(id).aabb))
  }

  private zoomToFit(aabbList: AABB[]) {
    if (!aabbList.length) return

    let aabb = AABB.merge(aabbList)
    console.log('aabb: ', aabb)
    let rect = AABB.rect(aabb)
    console.log('rect: ', rect)

    aabb = AABB.extend(aabb, max(rect.width / 10, rect.height / 10))
    rect = AABB.rect(aabb)
    console.log('rect: ', rect)

    const zoom = this.limitZoom(
      min(this.bound.width / rect.width, this.bound.height / rect.height),
    )
    const boundCenter = XY.from(XY.center(this.bound)).divide(zoom).xy
    const offset = XY.from(XY.center(rect)).minus(boundCenter).xy

    this.sceneMatrix = Matrix.of()
      .shift(XY.from(offset).multiplyNum(-1).xy)
      .scale(zoom, zoom)
      .clone()
  }
}

export const StageViewport = autoBind(makeObservable(new StageViewportService()))

export const getZoom = () => StageViewport.zoom
