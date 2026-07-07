import { AABB } from '@gitborlando/geo'
import { reflection } from 'first-di'
import { Matrix } from 'src/editor/geometry'
import { IMatrix } from 'src/editor/geometry/matrix'
import { StageViewport } from 'src/editor/stage/viewport'
import { Service } from 'src/global/service'

const dpr = devicePixelRatio

export type SurfaceCanvasType = 'mainCanvas' | 'topCanvas'

@reflection
export class RenderSurface extends Service {
  private container!: HTMLDivElement

  private canvas!: HTMLCanvasElement
  private ctx!: CanvasRenderingContext2D

  private topCanvas!: HTMLCanvasElement
  private topCtx!: CanvasRenderingContext2D

  constructor(private readonly stageViewport: StageViewport) {
    super()
    autoBind(this)
  }

  onCanvasInited() {
    this.effect(this.onResize())
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
    const { width, height } = this.currentCtx.canvas
    this.currentCtx.clearRect(0, 0, width, height)
  }

  ctxSaveRestore(func: (ctx: CanvasRenderingContext2D) => any) {
    this.currentCtx.save()
    func(this.currentCtx)
    this.currentCtx.restore()
  }

  private currentCtx!: CanvasRenderingContext2D

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

  private dprMatrix = Matrix.identity().scale(dpr, dpr)

  transformCanvas = () => {
    this.ctx.transform(...this.dprMatrix.tuple())
    this.ctx.transform(...this.stageViewport.sceneMatrix.tuple())
  }

  transformTopCanvas = () => {
    this.topCtx.transform(...this.dprMatrix.tuple())
    this.topCtx.transform(...this.stageViewport.sceneMatrix.tuple())
  }

  private onResize() {
    return reaction(
      () => ({ ...this.stageViewport.bound }),
      ({ width, height }) => {
        ;[this.canvas, this.topCanvas].forEach((canvas) => {
          canvas.width = width * dpr
          canvas.height = height * dpr
          canvas.style.width = `${width}px`
          canvas.style.height = `${height}px`
        })
      },
      { fireImmediately: true },
    )
  }

  getVisualSize = (aabb: AABB) => {
    const zoom = this.stageViewport.zoom
    return XY.$((aabb.maxX - aabb.minX) * zoom, (aabb.maxY - aabb.minY) * zoom)
  }

  getCanvas() {
    return this.canvas
  }

  getMainCtx() {
    return this.ctx
  }

  addEvent = <K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (this: HTMLDivElement, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions,
  ) => {
    this.container.addEventListener(type, listener, options)
    return () => this.container?.removeEventListener(type, listener, options)
  }
}
