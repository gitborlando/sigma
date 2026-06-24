import { type IRect } from '@gitborlando/geo'
import { Disposer } from '@gitborlando/toolkit/disposer'
import { clone, firstOne } from '@gitborlando/utils'
import { listen } from '@gitborlando/utils/browser'
import equal from 'fast-deep-equal'
import hotkeys from 'hotkeys-js'
import { EditorCommand } from 'src/editor/core/command'
import { Undo } from 'src/editor/core/undo'
import { IMatrix, Matrix, MRect } from 'src/editor/geometry'
import { HandleSelect } from 'src/editor/handle/select'
import { ElemMouseEvent } from 'src/editor/render/elem'
import { StageScene } from 'src/editor/render/scene'
import { StageSurface } from 'src/editor/render/surface'
import { SchemaHelper } from 'src/editor/schema/helper'
import { createSchemaTraverse } from 'src/editor/schema/traverse'
import { StageDrag } from 'src/editor/stage/interact/drag'
import { StageTransformer } from 'src/editor/stage/tools/transformer'
import {
  getSelectIdList,
  getSelectIdMap,
  getSelectPageId,
} from 'src/editor/utils/get'
import { YState } from 'src/editor/y-adapter/y-state'
import { ContextMenu } from 'src/global/context-menu'

class StageSelectService {
  @observable marquee: IRect = { x: 0, y: 0, width: 0, height: 0 }
  @observable hoverId?: string

  private lastSelectIdMap = <Record<string, boolean>>{}
  private isPointerDown = false

  startInteract() {
    return Disposer.combine(
      StageScene.sceneRoot.addEvent('mousedown', this.onSceneRootMouseDown),
      StageSurface.addEvent('dblclick', this.onDoubleClick),
      StageSurface.addEvent('mousemove', this.onHover),
      StageSurface.addEvent('contextmenu', this.onContextMenu),
      listen('pointerdown', () => (this.isPointerDown = true)),
      listen('pointerup', () => (this.isPointerDown = false)),
    )
  }

  private onHover(e: MouseEvent) {
    if (this.isPointerDown) return
    const hovered = firstOne(StageScene.elemsFromPoint(XY.client(e)))
    this.hoverId = hovered?.id
  }

  private onDoubleClick(e: Event) {
    if (!this.hoverId) return

    const selectIdList = getSelectIdList()
    const hoverSelected = !!getSelectIdMap()[this.hoverId]
    const hoverNode = YState.find(this.hoverId)

    if (hoverSelected) {
      if (hoverNode.type === 'text') {
        this.onEditText(hoverNode)
      }
    } else if (selectIdList.length === 1) {
      const ancestor = SchemaHelper.findAncestor(
        this.hoverId,
        (node) => node.parentId === firstOne(selectIdList),
      )
      this.onSingleSelect(ancestor.id, t('select nodes by clicking'))
    }
  }

  private onSceneRootMouseDown(e: ElemMouseEvent) {
    this.lastSelectIdMap = clone(getSelectIdMap())

    if (!this.hoverId || SchemaHelper.isFirstLayerFrame(this.hoverId)) {
      this.clearSelect()
      this.onMarqueeSelect()
      return
    }

    this.onStageSelect()
    StageTransformer.move(e.hostEvent)
  }

  private onContextMenu(e: MouseEvent) {
    if (this.hoverId) this.onStageSelect()

    const { copyPasteGroup, undoRedoGroup, nodeGroup, nodeReHierarchyGroup } =
      EditorCommand
    const baseMenu = [copyPasteGroup, undoRedoGroup]

    if (getSelectIdList().length || this.hoverId) {
      const menuOptions = [...baseMenu, nodeGroup, nodeReHierarchyGroup]
      ContextMenu.menus = menuOptions
      ContextMenu.openMenu(e as any)
    } else {
      ContextMenu.menus = baseMenu
      ContextMenu.openMenu(e as any)
    }
  }

  private clearSelect() {
    if (hotkeys.shift) return
    HandleSelect.clearSelect()
  }

  private onStageSelect() {
    if (SchemaHelper.isFirstLayerFrame(this.hoverId!)) return
    this.onSingleSelect(this.hoverId!, t('select nodes by clicking'))
  }

  onPanelSelect(id: string) {
    this.onSingleSelect(id, t('select nodes from panel'))
  }

  onCreateSelect(id: string) {
    this.onSingleSelect(id)
  }

  private onSingleSelect(id: ID, trackMsg?: string) {
    if (getSelectIdMap()[id]) return

    this.clearSelect()
    HandleSelect.select(id)

    if (trackMsg) Undo.track('client', trackMsg)
  }

  private onDeepSelect() {
    const hoverNode = YState.find(this.hoverId!)
    if (hoverNode?.type !== 'text') return
  }

  private onMarqueeSelect() {
    const marqueeAABB = new AABB(0, 0, 0, 0)

    const hitTest = (mrect: MRect) => {
      if (!AABB.collide(marqueeAABB, mrect.aabb)) return false
      return AABB.collide(
        Matrix.of(mrect.matrix).invertAABB(marqueeAABB),
        new AABB(0, 0, mrect.width, mrect.height),
      )
    }

    const traverser = createSchemaTraverse<{ matrix: IMatrix }>({
      schema: YState.schema,
      enter: (ctx) => {
        const { item, depth, childIds, forwardCtx } = ctx
        const elem = StageScene.findElem(item.id)

        if (!elem.visible) return false

        if (childIds?.length && depth === 0) {
          if (AABB.include(marqueeAABB, elem.aabb) === 1) {
            HandleSelect.select(item.id)
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
          HandleSelect.select(item.id)
          ctx.matrix = Matrix.of(mrect.matrix)
          return
        }

        return false
      },
    })

    StageSurface.disablePointEvent()

    StageDrag.onMove(({ marquee }) => {
      this.marquee = marquee
      AABB.updateFromRect(marqueeAABB, marquee)
      this.clearSelect()
      runInAction(() => traverser(SchemaHelper.getPageChildIds(getSelectPageId())))
    })
      .onDestroy(() => {
        this.marquee = { x: 0, y: 0, width: 0, height: 0 }

        if (!equal(getSelectIdMap(), this.lastSelectIdMap)) {
          Undo.track('client', t('select nodes with marquee'))
        }
      })
      .start()
  }

  private onEditText(hoverNode: S.Node) {}
}

export const StageSelect = autoBind(makeObservable(new StageSelectService()))
