import { type IRect } from '@gitborlando/geo'
import { Disposer } from '@gitborlando/toolkit/disposer'
import { clone, firstOne } from '@gitborlando/utils'
import { listen } from '@gitborlando/utils/browser'
import equal from 'fast-deep-equal'
import hotkeys from 'hotkeys-js'
import { IMatrix, Matrix, MRect } from 'src/editor/geometry'
import { ElemMouseEvent } from 'src/editor/render/elem'
import { SchemaHelper } from 'src/editor/schema/helper'
import { createSchemaTraverse } from 'src/editor/schema/traverse'
import { createStageDrag } from 'src/editor/stage/interact/drag'
import {
  getSelectIdList,
  getSelectIdMap,
  getSelectPageId,
} from 'src/editor/utils/get'
import { ContextMenu } from 'src/global/context-menu'
import { EditorService } from '../..'

export class StageSelectService extends EditorService {
  @observable marquee: IRect = { x: 0, y: 0, width: 0, height: 0 }
  @observable hoverId?: string

  private lastSelectIdMap = <Record<string, boolean>>{}
  private isPointerDown = false
  private stageDrag = createStageDrag(this.editor)

  startInteract() {
    return Disposer.combine(
      this.editor.stageScene.sceneRoot.addEvent(
        'mousedown',
        this.onSceneRootMouseDown,
      ),
      this.editor.stageSurface.addEvent('dblclick', this.onDoubleClick),
      this.editor.stageSurface.addEvent('mousemove', this.onHover),
      this.editor.stageSurface.addEvent('contextmenu', this.onContextMenu),
      listen('pointerdown', () => (this.isPointerDown = true)),
      listen('pointerup', () => (this.isPointerDown = false)),
    )
  }

  private onHover(e: MouseEvent) {
    if (this.isPointerDown) return
    const hovered = firstOne(this.editor.stageScene.elemsFromPoint(XY.client(e)))
    this.hoverId = hovered?.id
  }

  private onDoubleClick(e: Event) {
    if (!this.hoverId) return

    const selectIdList = getSelectIdList(this.editor)
    const hoverSelected = !!getSelectIdMap(this.editor)[this.hoverId]
    const hoverNode = this.editor.find(this.hoverId)

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
    this.lastSelectIdMap = clone(getSelectIdMap(this.editor))

    if (!this.hoverId || SchemaHelper.isFirstLayerFrame(this.hoverId)) {
      this.clearSelect()
      this.onMarqueeSelect()
      return
    }

    this.onStageSelect()
    this.editor.stageTransformer.move(e.hostEvent)
  }

  private onContextMenu(e: MouseEvent) {
    if (this.hoverId) this.onStageSelect()

    const { copyPasteGroup, undoRedoGroup, nodeGroup, nodeReHierarchyGroup } =
      this.editor.editorCommand
    const baseMenu = [copyPasteGroup, undoRedoGroup]

    if (getSelectIdList(this.editor).length || this.hoverId) {
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
    this.editor.handleSelect.clearSelect()
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
    if (getSelectIdMap(this.editor)[id]) return

    this.clearSelect()
    this.editor.handleSelect.select(id)

    if (trackMsg) this.editor.undo.track('client', trackMsg)
  }

  private onDeepSelect() {
    const hoverNode = this.editor.find(this.hoverId!)
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
      schema: this.editor.yState.schema,
      enter: (ctx) => {
        const { item, depth, childIds, forwardCtx } = ctx
        const elem = this.editor.stageScene.findElem(item.id)

        if (!elem.visible) return false

        if (childIds?.length && depth === 0) {
          if (AABB.include(marqueeAABB, elem.aabb) === 1) {
            this.editor.handleSelect.select(item.id)
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
          this.editor.handleSelect.select(item.id)
          ctx.matrix = Matrix.of(mrect.matrix)
          return
        }

        return false
      },
    })

    this.editor.stageSurface.disablePointEvent()

    this.stageDrag
      .onMove(({ marquee }) => {
        this.marquee = marquee
        AABB.updateFromRect(marqueeAABB, marquee)
        this.clearSelect()
        runInAction(() =>
          traverser(SchemaHelper.getPageChildIds(getSelectPageId(this.editor))),
        )
      })
      .onDestroy(() => {
        this.marquee = { x: 0, y: 0, width: 0, height: 0 }

        if (!equal(getSelectIdMap(this.editor), this.lastSelectIdMap)) {
          this.editor.undo.track('client', t('select nodes with marquee'))
        }
      })
      .start()
  }

  private onEditText(hoverNode: S.Node) {}
}
