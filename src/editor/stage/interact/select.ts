import { firstOne } from '@gitborlando/utils'
import { listen } from '@gitborlando/utils/browser'
import autobind from 'class-autobind-decorator'
import equal from 'fast-deep-equal'
import hotkeys from 'hotkeys-js'
import { observable } from 'mobx'
import { EditorCommand } from 'src/editor/editor/command'
import { MRect, OBB } from 'src/editor/math'
import { OperateNode } from 'src/editor/operate/node'
import { OperateText } from 'src/editor/operate/text'
import { ElemMouseEvent } from 'src/editor/render/elem'
import { StageScene } from 'src/editor/render/scene'
import { StageSurface } from 'src/editor/render/surface'
import { SchemaHelper, SchemaUtilTraverseData } from 'src/editor/schema/helper'
import { Schema } from 'src/editor/schema/schema'
import { StageTransformer } from 'src/editor/stage/tools/transformer'
import { intersectRect } from 'src/editor/utils'
import { getSelectIdMap, YClients } from 'src/editor/y-state/y-clients'
import { ContextMenu } from 'src/global/context-menu'
import { StageDrag } from 'src/global/event/drag'
import { macroMatch, type IRect } from 'src/shared/utils/normal'
import { SchemaUtil } from 'src/shared/utils/schema'

@autobind
class StageSelectService {
  @observable marquee: IRect = { x: 0, y: 0, width: 0, height: 0 }
  @observable hoverId?: string

  private lastSelectIdMap = <Record<string, boolean>>{}
  private isPointerDown = false

  startInteract() {
    return Disposer.collect(
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

    const hoverSelected = OperateNode.selectIds.value.has(this.hoverId)
    const hoverNode = Schema.find(this.hoverId)

    if (hoverSelected) {
      if (hoverNode.type === 'text') {
        this.onEditText(hoverNode)
      }
      if (SchemaUtil.is<V1.Frame>(hoverNode, 'frame')) {
        this.onEditVector(hoverNode)
      }
    } else if (OperateNode.selectIds.value.size === 1) {
      const ancestor = SchemaUtil.findAncestor(
        this.hoverId,
        (node) => node.parentId === firstOne(OperateNode.selectIds.value),
      )
      this.onSelect(ancestor.id)
    }
  }

  private onSceneRootMouseDown(e: ElemMouseEvent) {
    this.lastSelectIdMap = getSelectIdMap()

    if (!this.hoverId || SchemaHelper.isFirstLayerFrame(this.hoverId)) {
      this.clearSelect()
      this.onMarqueeSelect()
      return
    }

    this.onMousedownSelect()
    StageTransformer.move(e.hostEvent)
  }

  private onContextMenu(e: MouseEvent) {
    if (this.hoverId) this.onMousedownSelect()

    const { copyPasteGroup, undoRedoGroup, nodeGroup, nodeReHierarchyGroup } =
      EditorCommand
    const baseMenu = [copyPasteGroup, undoRedoGroup]

    if (getSelectIdMap().length || this.hoverId) {
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
    YClients.clearSelect()
  }

  onPanelSelect(id: string) {
    if (getSelectIdMap()[id]) return

    this.clearSelect()
    YUndo.untrack(() => YClients.select(id))
    YUndo.track({
      type: 'client',
      description: t('selected nodes via panel'),
    })
    YClients.afterSelect.dispatch()
  }

  onCreateSelect(id: string) {
    this.clearSelect()
    YClients.select(id)
    // UILeftPanelLayer.expandAncestor(id)
    YClients.afterSelect.dispatch()
  }

  private onMousedownSelect() {
    this.onSelect(this.hoverId!)
    YClients.afterSelect.dispatch()
  }

  private onSelect(id: ID) {
    if (getSelectIdMap()[id]) return
    if (SchemaHelper.isFirstLayerFrame(id)) return

    this.clearSelect()
    YClients.select(id)

    if (!equal(getSelectIdMap(), this.lastSelectIdMap)) {
      YUndo.track({
        type: 'client',
        description: t('selected nodes via mousedown'),
      })
      // UILeftPanelLayer.expandAncestor(id)
    }
  }

  private onDeepSelect() {
    const hoverNode = Schema.find(this.hoverId!)
    if (hoverNode?.type !== 'text') return
    OperateText.intoEditing.dispatch(hoverNode.id)
  }

  private onMarqueeSelect() {
    let marqueeOBB = OBB.identity()
    let marqueeMrect = MRect.identity()
    let marqueeAABB = new AABB(0, 0, 0, 0)

    const hitTest = (obb: OBB) => {
      const aabbResult = AABB.collide(marqueeOBB.aabb, obb.aabb)
      if (macroMatch`-180|-90|0|90|180`(obb.rotation)) return aabbResult
      return aabbResult && marqueeOBB.collide(obb)
    }

    const hitTestMrect = (mrect: MRect) => {
      if (!intersectRect(AABB.rect(marqueeAABB), AABB.rect(mrect.aabb))) return false
      marqueeAABB = Matrix(mrect.matrix).invertAABB(marqueeAABB)

      return intersectRect(AABB.rect(marqueeAABB), {
        x: 0,
        y: 0,
        width: mrect.width,
        height: mrect.height,
      })
    }

    const traverseTest = ({ id, node, childIds, depth }: SchemaUtilTraverseData) => {
      const elem = StageScene.findElem(id)
      if (!elem.visible) return false

      if (childIds?.length && depth === 0) {
        if (AABB.include(marqueeOBB.aabb, elem.aabb) === 1) {
          YUndo.untrack(() => YClients.select(id))
          // UILeftPanelLayer.needExpandIds.add(id)
          return false
        }
        return
      }
      if (/* hitTest(elem.obb) */ hitTestMrect(elem.mrect)) {
        YUndo.untrack(() => YClients.select(id))
        // UILeftPanelLayer.needExpandIds.add(node.parentId)
        return
      }
      return false
    }

    const traverse = SchemaHelper.createCurrentPageTraverse({
      callback: traverseTest,
    })

    StageSurface.disablePointEvent()

    StageDrag.onStart()
      .onMove(({ marquee }) => {
        this.marquee = marquee
        marqueeMrect.width = marquee.width
        marqueeMrect.height = marquee.height
        marqueeMrect.matrix = Matrix().shift(marquee).matrix
        marqueeAABB = AABB.update(
          marqueeAABB,
          marquee.x,
          marquee.y,
          marquee.x + marquee.width,
          marquee.y + marquee.height,
        )
        marqueeOBB = OBB.fromRect(this.marquee)
        this.clearSelect()
        runInAction(() => traverse())
      })
      .onDestroy(() => {
        this.marquee = { x: 0, y: 0, width: 0, height: 0 }
        YClients.afterSelect.dispatch()

        if (!equal(getSelectIdMap(), this.lastSelectIdMap)) {
          YUndo.track({
            type: 'client',
            description: t('selected nodes via marquee'),
          })
        }
      })
  }

  private onEditText(hoverNode: V1.Node) {
    OperateText.intoEditing.dispatch(hoverNode.id)
  }

  private onEditVector(hoverNode: V1.Node) {
    if (OperateNode.intoEditNodeId.value) {
      OperateNode.intoEditNodeId.dispatch('')
      OperateNode.clearSelect()
      return
    }
    hoverNode && OperateNode.intoEditNodeId.dispatch(hoverNode.id)
  }
}

export const StageSelect = makeObservable(new StageSelectService())
