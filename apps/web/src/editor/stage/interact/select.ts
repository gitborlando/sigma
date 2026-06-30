import { type IRect } from '@gitborlando/geo'
import { Disposer } from '@gitborlando/toolkit/disposer'
import { firstOne } from '@gitborlando/utils'
import { listen } from '@gitborlando/utils/browser'
import equal from 'fast-deep-equal'
import hotkeys from 'hotkeys-js'
import type { EditorServiceGetters } from 'src/editor'
import { SelectControllerService } from 'src/editor/controller/select'
import { IMatrix, Matrix, MRect } from 'src/editor/geometry'
import { HandleSelectService, type Selection } from 'src/editor/handle/select'
import { ElemMouseEvent } from 'src/editor/render/elem'
import { StageSceneService } from 'src/editor/render/scene'
import { StageSurfaceService } from 'src/editor/render/surface'
import { SchemaHelper } from 'src/editor/schema/helper'
import { createSchemaTraverse } from 'src/editor/schema/traverse'
import { createStageDragger } from 'src/editor/stage/dragger'
import { StageTransformerService } from 'src/editor/stage/tools/transformer'
import { StageViewportService } from 'src/editor/stage/viewport'
import { YStateService } from 'src/editor/y-adapter/y-state'
import { ContextMenu } from 'src/global/context-menu'
import { Service } from 'src/global/service'
import { UndoService } from '../../core/undo'

export class StageSelectService extends Service {
  @observable marquee: IRect = { x: 0, y: 0, width: 0, height: 0 }
  @observable hoverId?: string

  private lastSelection = <Selection>{}
  private isPointerDown = false

  constructor(
    private readonly stageScene: StageSceneService,
    private readonly stageSurface: StageSurfaceService,
    private readonly stageTransformer: StageTransformerService,
    private readonly handleSelect: HandleSelectService,
    private readonly selectController: SelectControllerService,
    private readonly undo: UndoService,
    private readonly yState: YStateService,
    private readonly stageViewport: StageViewportService,
    private readonly getEditorCommand: EditorServiceGetters['getEditorCommand'],
  ) {
    super()
    makeObservable(this)
    autoBind(this)
  }

  startInteract() {
    return Disposer.combine(
      this.stageScene.sceneRoot.addEvent('mousedown', this.onSceneRootMouseDown),
      this.stageSurface.addEvent('dblclick', this.onDoubleClick),
      this.stageSurface.addEvent('mousemove', this.onHover),
      this.stageSurface.addEvent('contextmenu', this.onContextMenu),
      listen('pointerdown', () => (this.isPointerDown = true)),
      listen('pointerup', () => (this.isPointerDown = false)),
    )
  }

  private onHover(e: MouseEvent) {
    if (this.isPointerDown) return
    const hovered = firstOne(this.stageScene.elemsFromPoint(XY.client(e)))
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

  private onContextMenu(e: MouseEvent) {
    if (this.hoverId && !SchemaHelper.isFirstLayerFrame(this.hoverId)) {
      this.selectController.onStageSelect(this.hoverId)
    }

    const { copyPasteGroup, undoRedoGroup, nodeGroup, nodeReHierarchyGroup } =
      this.getEditorCommand()
    const baseMenu = [copyPasteGroup, undoRedoGroup]

    if (this.handleSelect.selectIdList.length || this.hoverId) {
      const menuOptions = [...baseMenu, nodeGroup, nodeReHierarchyGroup]
      ContextMenu.menus = menuOptions
      ContextMenu.openMenu(e as any)
    } else {
      ContextMenu.menus = baseMenu
      ContextMenu.openMenu(e as any)
    }
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
        const elem = this.stageScene.findElem(item.id)

        if (!elem.visible) return false

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

    this.stageSurface.disablePointEvent()

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
