import type { IXY } from '@gitborlando/geo'
import { firstOne, type NoopFunc } from '@gitborlando/utils'
import { listen } from '@gitborlando/utils/browser'
import { untracked } from 'mobx'
import { DocHelper } from 'src/editor/doc/helper'
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
  @observable hintId?: string

  hitSceneElems: Elem[] = []

  private eventXY = XY.$(0, 0)
  private isPointerEventNone = false

  constructor(
    private readonly renderTree: RenderTree,
    private readonly renderSurface: RenderSurface,
    private readonly renderPipeline: RenderPipeline,
    private readonly stageViewport: StageViewport,
  ) {
    super()
    autoBind(makeObservable(this))
  }

  onCanvasInited() {
    this.effect(this.renderSurface.addEvent('mousedown', this.onMouseEvent))
    this.effect(this.renderSurface.addEvent('mousemove', this.onMouseEvent))
    this.effect(this.renderSurface.addEvent('mouseup', () => (this.hintId = '')))
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
    this.hitSceneElems.length = 0
    const canvasXY = this.stageViewport.toCanvasXY(xy)
    this.eventXY = this.stageViewport.sceneMatrix.invertXY(canvasXY)
    this.renderPipeline.updateRenderPriorityXY(this.eventXY)
  }

  private traverseRootElems(
    walk: (props: {
      elem: Elem
      stopped: boolean
      stopPropagation: NoopFunc
      hitList?: Elem[]
      xy?: IXY
      globalXY?: IXY
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

        const hitChildElems: Elem[] = []
        reverseFor(elem.children, (child) =>
          traverse({ elem: child, hitList: hitChildElems, xy }),
        )
        if (elem.type === 'sceneElem') this.hitSceneElems.push(...hitChildElems)
        walk({ elem, stopped, stopPropagation, hitList, xy, globalXY: this.eventXY })
      } else {
        reverseFor(elem.children, (child) => {
          traverse({ elem: child })
        })
        walk({ elem, stopped, stopPropagation })
      }
    }

    traverse({ elem: this.renderTree.widgetRoot, xy: this.eventXY, hitList: [] })
    traverse({ elem: this.renderTree.sceneRoot, xy: this.eventXY, hitList: [] })

    const hovered = firstOne(this.hitSceneElems)
    if (!this.hintId) {
      if (hovered?.id && DocHelper.isRootFrame(hovered.id)) return
      this.hoverId = this.hoverId !== hovered?.id ? hovered?.id : this.hoverId
    }
  }

  private onMouseEvent(e: MouseEvent) {
    if (this.isPointerEventNone || this.renderPipeline.isSliceRendering) return

    if (e.type === 'mousedown' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }

    this.prepareHitTest(XY.client(e))

    this.traverseRootElems(
      ({ elem, stopped, stopPropagation, hitList, xy, globalXY }) => {
        const hit = elem.hitTest(xy!)

        if (hit) {
          hitList?.push(elem)
        }

        if (!stopped && xy && globalXY) {
          elem.eventHandle.triggerEvent({
            e,
            xy,
            globalXY,
            hit,
            stopPropagation,
            ancestors: hitList || [],
          })
        }
      },
    )
  }
}
