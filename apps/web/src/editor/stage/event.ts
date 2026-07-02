import type { IXY } from '@gitborlando/geo'
import { Disposer } from '@gitborlando/toolkit/disposer'
import type { NoopFunc } from '@gitborlando/utils'
import { listen } from '@gitborlando/utils/browser'
import { Matrix } from 'src/editor/geometry'
import { Elem } from 'src/editor/render/elem'
import { RendererService } from 'src/editor/render/renderer'
import { RenderSurfaceService } from 'src/editor/render/surface'
import { RenderTreeService } from 'src/editor/render/tree'
import { StageViewportService } from 'src/editor/stage/viewport'
import { reverseFor } from 'src/editor/utils/misc'
import { Service } from 'src/global/service'

export class StageEventService extends Service {
  private eventXY = XY.$(0, 0)
  private elemsFromPoint: Elem[] = []
  private isPointerEventNone = false

  constructor(
    private readonly renderTree: RenderTreeService,
    private readonly renderSurface: RenderSurfaceService,
    private readonly stageViewport: StageViewportService,
    private readonly renderer: RendererService,
  ) {
    super()
    autoBind(this)
  }

  onCanvasInited() {
    this.effect(this.onPointerEvents())
  }

  getElemsFromPoint(e?: IXY) {
    if (!e) return this.elemsFromPoint

    this.prepareHitTest(e)

    this.traverseLayerList(({ elem, hitList, xy }) => {
      if (elem.hitTest(xy!)) hitList?.push(elem)
    })

    return this.elemsFromPoint
  }

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

  isElemVisible(elem: Elem) {
    return elem.getVisible(this.stageViewport.sceneAABB)
  }

  private prepareHitTest(xy: IXY) {
    const canvasXY = this.stageViewport.toCanvasXY(xy)
    this.eventXY = this.stageViewport.sceneMatrix.invertXY(canvasXY)
    this.elemsFromPoint.length = 0
    this.renderer.updateRenderPriorityXY(this.eventXY)
  }

  private traverseLayerList(
    func: (props: {
      elem: Elem
      capture: boolean
      stopped: boolean
      stopPropagation: NoopFunc
      hitList?: Elem[]
      xy?: IXY
    }) => any,
    noBubble?: boolean,
  ) {
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
      if (!this.isElemVisible(elem)) return

      if (xy) {
        if (elem.node?.matrix) xy = Matrix.of(elem.node.matrix).invertXY(xy)

        func({ elem, capture: true, stopped, stopPropagation, hitList, xy })

        const subHitList: Elem[] = []
        reverseFor(elem.children, (child) =>
          traverse({ layerIndex, elem: child, hitList: subHitList, xy }),
        )
        this.elemsFromPoint.push(...subHitList)

        if (!noBubble) {
          func({ elem, capture: false, stopped, stopPropagation, hitList, xy })
        }
      } else {
        func({ elem, capture: true, stopped, stopPropagation })

        reverseFor(elem.children, (child) => traverse({ layerIndex, elem: child }))

        if (!noBubble) {
          func({ elem, capture: false, stopped, stopPropagation })
        }
      }
    }

    reverseFor(this.renderTree.rootElems, (elem, layerIndex) =>
      traverse({ layerIndex, elem, xy: this.eventXY, hitList: [] }),
    )
  }

  private onPointerEvents() {
    const onMouseEvent = (e: MouseEvent) => {
      if (this.isPointerEventNone || this.renderer.isSliceRendering) return

      const point = XY.client(e)
      this.prepareHitTest(point)

      this.traverseLayerList(
        ({ elem, capture, stopped, stopPropagation, hitList, xy }) => {
          const hit = elem.hitTest(xy!)
          if (hit) hitList?.push(elem)
          if (!stopped) {
            elem.eventHandle.triggerMouseEvent(e, xy!, hit, capture, stopPropagation)
          }
        },
      )
    }

    return Disposer.combine(
      this.renderSurface.addEvent('mousedown', onMouseEvent, { capture: true }),
      this.renderSurface.addEvent('mousemove', onMouseEvent, { capture: true }),
    )
  }
}
