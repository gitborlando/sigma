import type { IXY } from '@gitborlando/geo'
import { firstOne, type NoopFunc } from '@gitborlando/utils'
import { listen } from '@gitborlando/utils/browser'
import { untracked } from 'mobx'
import { Matrix } from 'src/editor/geometry'
import { Elem } from 'src/editor/render/elem/elem'
import { RenderPipeline } from 'src/editor/render/pipeline'
import { RenderSurface } from 'src/editor/render/surface'
import { RenderTree } from 'src/editor/render/tree'
import { StageViewport } from 'src/editor/stage/viewport'
import { Service } from 'src/global/service'

@reflection
export class StageEvent extends Service {
  @observable hoverId?: string

  private eventXY = XY.$(0, 0)
  private elemsFromPoint: Elem[] = []
  private isPointerEventNone = false

  constructor(
    private readonly renderTree: RenderTree,
    private readonly renderSurface: RenderSurface,
    private readonly stageViewport: StageViewport,
    private readonly renderPipeline: RenderPipeline,
  ) {
    super()
    autoBind(makeObservable(this))
  }

  onCanvasInited() {
    this.effect(this.renderSurface.addEvent('mousedown', this.onMouseEvent))
    this.effect(this.renderSurface.addEvent('mousemove', this.onMouseEvent))
  }

  getElemsFromPoint(e?: IXY) {
    if (!e) return this.elemsFromPoint

    this.prepareHitTest(e)

    this.traverseRootElems(({ elem, hitList, xy }) => {
      if (elem.hitTest(xy!)) hitList?.push(elem)
    })

    return this.elemsFromPoint
  }

  enablePointEvent() {
    this.isPointerEventNone = false
  }

  disablePointEvent(setbackOnPointerUp = true) {
    this.isPointerEventNone = true

    if (setbackOnPointerUp) {
      return listen('mouseup', { once: true }, this.enablePointEvent)
    }

    return this.enablePointEvent
  }

  isElemVisible(elem: Elem) {
    return elem.getVisible(untracked(() => this.stageViewport.sceneAABB))
  }

  private prepareHitTest(xy: IXY) {
    const canvasXY = this.stageViewport.toCanvasXY(xy)
    this.eventXY = this.stageViewport.sceneMatrix.invertXY(canvasXY)
    this.elemsFromPoint.length = 0
    this.renderPipeline.updateRenderPriorityXY(this.eventXY)
  }

  private traverseRootElems(
    walk: (props: {
      elem: Elem
      stopped: boolean
      stopPropagation: NoopFunc
      hitList?: Elem[]
      xy?: IXY
    }) => any,
  ) {
    let stopped = false
    const stopPropagation = () => (stopped = true)

    const reverseFor = <T>(
      items: T[],
      callback: (item: T, index: number) => any,
    ) => {
      for (let i = items.length - 1; i >= 0; i--) callback(items[i], i)
    }

    const traverse = (props: { elem: Elem; hitList?: Elem[]; xy?: IXY }) => {
      const { elem, hitList } = props
      let xy = props.xy
      if (!this.isElemVisible(elem)) return

      if (xy) {
        if (elem.node?.matrix) xy = Matrix.of(elem.renderMatrix).invertXY(xy)

        const subHitList: Elem[] = []
        reverseFor(elem.children, (child) =>
          traverse({ elem: child, hitList: subHitList, xy }),
        )
        this.elemsFromPoint.push(...subHitList)
        walk({ elem, stopped, stopPropagation, hitList, xy })
      } else {
        reverseFor(elem.children, (child) => traverse({ elem: child }))
        walk({ elem, stopped, stopPropagation })
      }
    }

    traverse({ elem: this.renderTree.widgetRoot, xy: this.eventXY, hitList: [] })
    traverse({ elem: this.renderTree.sceneRoot, xy: this.eventXY, hitList: [] })

    const hover = firstOne(
      this.elemsFromPoint.filter((elem) => elem.type === 'sceneElem'),
    )
    this.hoverId = this.hoverId !== hover?.id ? hover?.id : this.hoverId
  }

  private onMouseEvent(e: MouseEvent) {
    if (this.isPointerEventNone || this.renderPipeline.isSliceRendering) return

    if (e.type === 'mousedown' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }

    const point = XY.client(e)
    this.prepareHitTest(point)

    this.traverseRootElems(({ elem, stopped, stopPropagation, hitList, xy }) => {
      const hit = elem.hitTest(xy!)

      if (hit) {
        hitList?.push(elem)
      }

      if (!stopped) {
        elem.eventHandle.triggerEvent({
          e,
          xy: xy!,
          hit,
          stopPropagation,
          ancestors: hitList || [],
        })
      }
    })
  }
}
