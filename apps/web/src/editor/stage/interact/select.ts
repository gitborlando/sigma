import { type IRect } from '@gitborlando/geo'
import { Disposer } from '@gitborlando/toolkit/disposer'
import { firstOne } from '@gitborlando/utils'
import { listen } from '@gitborlando/utils/browser'
import equal from 'fast-deep-equal'
import { reflection } from 'first-di'
import hotkeys from 'hotkeys-js'
import { SelectController } from 'src/editor/controller/select'
import { IMatrix, Matrix, MRect } from 'src/editor/geometry'
import { HandleSelect, type Selection } from 'src/editor/handle/select'
import { ElemMouseEvent } from 'src/editor/render/elem'
import { RenderSurface } from 'src/editor/render/surface'
import { RenderTree } from 'src/editor/render/tree'
import { SchemaHelper } from 'src/editor/schema/helper'
import { createSchemaTraverse } from 'src/editor/schema/traverse'
import { createStageDragger } from 'src/editor/stage/dragger'
import { StageEvent } from 'src/editor/stage/event'
import { StageTransformer } from 'src/editor/stage/tools/transformer'
import { StageViewport } from 'src/editor/stage/viewport'
import { YState } from 'src/editor/y-adapter/y-state'
import { Service } from 'src/global/service'
import { Undo } from '../../core/undo'

@reflection
export class StageSelect extends Service {
  @observable marquee: IRect = { x: 0, y: 0, width: 0, height: 0 }
  @observable hoverId?: string

  private lastSelection = <Selection>{}
  private isPointerDown = false

  constructor(
    private readonly renderTree: RenderTree,
    private readonly renderSurface: RenderSurface,
    private readonly stageEvent: StageEvent,
    private readonly stageTransformer: StageTransformer,
    private readonly handleSelect: HandleSelect,
    private readonly selectController: SelectController,
    private readonly undo: Undo,
    private readonly yState: YState,
    private readonly stageViewport: StageViewport,
  ) {
    super()
    autoBind(makeObservable(this))
  }

  startInteract() {
    return Disposer.combine(
      this.renderTree.sceneRoot.addEvent('mousedown', this.onSceneRootMouseDown),
      this.renderSurface.addEvent('dblclick', this.onDoubleClick),
      this.renderSurface.addEvent('mousemove', this.onHover),
      // this.renderSurface.addEvent('contextmenu', this.onContextMenu),
      listen('pointerdown', () => (this.isPointerDown = true)),
      listen('pointerup', () => (this.isPointerDown = false)),
    )
  }

  private onHover(e: MouseEvent) {
    if (this.isPointerDown) return
    const hovered = firstOne(
      this.stageEvent
        .getElemsFromPoint(XY.client(e))
        .filter((elem) => elem.type === 'sceneElem'),
    )
    this.hoverId = hovered?.id
  }

  private onDoubleClick(e: Event) {
    if (!this.hoverId) return

    const selectIdList = this.handleSelect.selectIdList
    const hoverSelected = !!this.handleSelect.selectIdMap[this.hoverId]
    const hoverNode = this.yState.find<S.Node>(this.hoverId)

    if (hoverSelected) {
      if (hoverNode.type === 'text') {
        this.onEditText(hoverNode)
      }
    } else if (selectIdList.length === 1) {
      const ancestor = SchemaHelper.findAncestor(
        this.hoverId,
        (node) => node.parentId === firstOne(selectIdList),
      )
      this.selectController.onStageSelect(ancestor.id)
    }
  }

  private onSceneRootMouseDown(e: ElemMouseEvent) {
    this.lastSelection = { ...this.handleSelect.selectIdMap }

    if (!this.hoverId || SchemaHelper.isFirstLayerFrame(this.hoverId)) {
      this.selectController.clearSelect()
      this.onMarqueeSelect()
      return
    }

    this.selectController.onStageSelect(this.hoverId)
    this.stageTransformer.move(e.hostEvent)
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
      schema: this.yState.schema,
      enter: (ctx) => {
        const { item, depth, childIds, forwardCtx } = ctx
        const elem = this.renderTree.findElem(item.id)

        if (!this.stageEvent.isElemVisible(elem)) return false

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
        traverser(SchemaHelper.getPageChildIds(this.handleSelect.selectPageId))
        this.selectController.replaceSelection(
          hotkeys.shift
            ? { ...this.lastSelection, ...marqueeSelection }
            : marqueeSelection,
        )
      })
      .onDestroy(() => {
        this.marquee = { x: 0, y: 0, width: 0, height: 0 }

        if (!equal(this.handleSelect.selectIdMap, this.lastSelection)) {
          this.undo.track('client', t('select nodes with marquee'))
        }
      })
      .start()
  }

  private onEditText(hoverNode: S.Node) {}
}
