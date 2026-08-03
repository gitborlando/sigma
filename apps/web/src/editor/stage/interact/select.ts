import { type IRect } from '@gitborlando/geo'
import { Disposer } from '@gitborlando/toolkit/disposer'
import { clone, firstOne } from '@gitborlando/utils'
import { isLeftMouse, listen } from '@gitborlando/utils/browser'
import equal from 'fast-deep-equal'
import hotkeys from 'hotkeys-js'
import { SelectAction } from 'src/editor/action/select'
import { IMatrix, Matrix, MRect } from 'src/editor/geometry'
import { ElemMouseEvent } from 'src/editor/render/elem/event'
import { RenderSurface } from 'src/editor/render/surface'
import { RenderTree } from 'src/editor/render/tree'
import { SchemaHelper } from 'src/editor/schema/helper'
import { createSchemaTraverse } from 'src/editor/schema/traverse'
import { Select, type Selection } from 'src/editor/select'
import { createStageDragger } from 'src/editor/stage/dragger'
import { StageEvent } from 'src/editor/stage/event'
import { StageTransformer } from 'src/editor/stage/transformer'
import { StageViewport } from 'src/editor/stage/viewport'
import { YState } from 'src/editor/y-adapter/y-state'
import { Service } from 'src/global/service'
import { Undo } from '../../action/undo'

@reflection
export class StageSelect extends Service {
  @observable marquee: IRect = { x: 0, y: 0, width: 0, height: 0 }

  @computed private get hoverId() {
    return this.stageEvent.hoverId
  }

  private lastSelection = <Selection>{}
  private isPointerDown = false

  constructor(
    private readonly renderTree: RenderTree,
    private readonly renderSurface: RenderSurface,
    private readonly stageEvent: StageEvent,
    private readonly stageTransformer: StageTransformer,
    private readonly select: Select,
    private readonly selectAction: SelectAction,
    private readonly undo: Undo,
    private readonly yState: YState,
    private readonly stageViewport: StageViewport,
  ) {
    super()
    autoBind(makeObservable(this))
  }

  startInteract() {
    return Disposer.combine(
      this.renderTree.sceneRoot.addEvent('mousedown', this.onMouseDown),
      this.renderSurface.addEvent('dblclick', this.onDoubleClick),
      listen('pointerdown', () => (this.isPointerDown = true)),
      listen('pointerup', () => (this.isPointerDown = false)),
    )
  }

  private onDoubleClick(e: Event) {
    if (!this.hoverId) return

    const selectIds = this.select.selectIds
    const hoverSelected = !!this.select.selection[this.hoverId]
    const hoverNode = this.yState.find<S.Node>(this.hoverId)

    if (hoverSelected) {
      if (hoverNode.type === 'text') {
        this.onEditText(hoverNode)
      }
    } else if (selectIds.length === 1) {
      const ancestor = SchemaHelper.findAncestor(
        this.hoverId,
        (node) => node.parentId === firstOne(selectIds),
      )
      this.selectAction.onStageSelect(ancestor.id)
    }
  }

  private onMouseDown(e: ElemMouseEvent) {
    this.lastSelection = clone(this.select.selection)

    const leftMouse = isLeftMouse(e.hostEvent)
    const isPointInTransformer = this.stageTransformer.isPointIn(e.xy)

    if (isPointInTransformer) {
      if (leftMouse) this.stageTransformer.onMove(e)
      return
    }

    if (!this.hoverId || SchemaHelper.isRootFrame(this.hoverId)) {
      if (leftMouse) {
        this.selectAction.clearSelect()
        this.onMarqueeSelect()
      }
      return
    }

    this.selectAction.onStageSelect(this.hoverId)
    if (leftMouse) this.stageTransformer.onMove(e)
  }

  private onMarqueeSelect() {
    const marqueeAABB = new AABB(0, 0, 0, 0)
    let marqueeSelection = <Selection>{}

    const hitTest = (mrect: MRect) => {
      if (!AABB.collide(marqueeAABB, mrect.aabb)) return false
      return AABB.collide(
        Matrix.of(mrect.matrix).invertAABB(marqueeAABB),
        new AABB(0, 0, mrect.width, mrect.height),
      )
    }

    const traverser = createSchemaTraverse<{ matrix: IMatrix }>({
      enter: (ctx) => {
        const { item, depth, childIds, forwardCtx } = ctx
        const elem = this.renderTree.findElem(item.id)

        if (!this.stageEvent.isElemVisible(elem)) {
          return false
        }

        if (childIds?.length && depth === 0) {
          if (AABB.include(marqueeAABB, elem.aabb) === 1) {
            marqueeSelection[item.id] = true
            return false
          }
          ctx.matrix = Matrix.of(elem.mrect.matrix)
          return
        }

        const forwardMatrix = forwardCtx?.matrix ?? Matrix.identity()
        const mrect = MRect.fromRect(
          elem.mrect,
          Matrix.of(forwardMatrix).append(elem.mrect.matrix).plain(),
        )
        if (hitTest(mrect)) {
          marqueeSelection[item.id] = true
          ctx.matrix = Matrix.of(mrect.matrix)
          return
        }

        return false
      },
    })

    this.stageEvent.disablePointEvent()

    createStageDragger(this.stageViewport)
      .onMove(({ marquee }) => {
        this.marquee = marquee
        AABB.updateFromRect(marqueeAABB, marquee)
        marqueeSelection = {}
        traverser(this.select.getSelectedPage().childIds)
        this.selectAction.replaceSelection(
          hotkeys.shift
            ? { ...this.lastSelection, ...marqueeSelection }
            : marqueeSelection,
        )
      })
      .onDestroy(() => {
        this.marquee = { x: 0, y: 0, width: 0, height: 0 }

        if (!equal(this.select.selection, this.lastSelection)) {
          this.undo.track('client', t('select nodes with marquee'))
        }
      })
      .start()
  }

  private onEditText(hoverNode: S.Node) {}
}
