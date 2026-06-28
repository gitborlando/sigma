import { type IXY } from '@gitborlando/geo'
import { getSet, type NoopFunc } from '@gitborlando/utils'
import { memorized } from '@sigma/utils/common'
import type { EditorSettingService } from 'src/editor/core/setting'
import { type IMatrix, Matrix, MRect } from 'src/editor/geometry'
import type { ElemDrawerService } from 'src/editor/render/draw'
import type { StageSurfaceService } from 'src/editor/render/surface'
import type { StageViewportService } from 'src/editor/stage/viewport'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      elem: ElemProps
    }
  }
}

export type ElemProps = {
  node: S.Node
  hidden?: boolean
  events?: Partial<Record<ElemEventType, ElemEventFunc>>
  children?: ReactNode[]
}

export type ElemContext = {
  getEditorSetting: () => EditorSettingService
  getElemDrawer: () => ElemDrawerService
  getStageSurface: () => StageSurfaceService
  getStageViewport: () => StageViewportService
}

export class Elem {
  constructor(
    public context: ElemContext,
    public id = '',
    public type: 'sceneElem' | 'widgetElem',
  ) {}
  clip = false
  hidden = false
  optimize = false

  private _node!: S.Node
  get node() {
    return this._node
  }
  set node(node: S.Node) {
    this.context.getStageSurface().collectDirty(this)
    this._node = node
    this.context.getStageSurface().collectDirty(this)
  }

  private _mrect = MRect.identity()
  private memoMRect = memorized(() => this._mrect.clone(this.node))
  get mrect(): MRect {
    return this.memoMRect([this.node.width, this.node.height, this.node.matrix])
  }

  private memoAABB = memorized(() =>
    Matrix.of(this.globalMatrix).applyAABB({
      minX: 0,
      minY: 0,
      maxX: this.node.width,
      maxY: this.node.height,
    }),
  )
  get aabb() {
    return this.memoAABB([this.globalMatrix, this.node.width, this.node.height])
  }

  private _globalMatrix = Matrix.identity()
  private memoGlobalMatrix = memorized(() => {
    return Matrix.of(this.parent.globalMatrix).append(this.node.matrix)
  })
  get globalMatrix(): IMatrix {
    if (!this.parent) return this._globalMatrix
    if (!this.node) return this.parent.globalMatrix
    return this.memoGlobalMatrix([this.node.matrix, this.parent.globalMatrix])
  }

  private memoVisible = memorized(() => {
    return AABB.collide(this.aabb, this.context.getStageViewport().sceneAABB)
  })
  get visible() {
    if (this.hidden) return false
    if (this.id === 'sceneRoot') return true
    if (this.type === 'widgetElem') return true
    const { sceneAABB } = this.context.getStageViewport()
    return this.memoVisible([
      this.aabb.minX,
      this.aabb.minY,
      this.aabb.maxX,
      this.aabb.maxY,
      sceneAABB,
    ])
  }

  getDirtyRect() {
    if (!this.node) return null
    return this.aabb
  }

  traverseDraw() {
    if (!this.visible) return

    const stageSurface = this.context.getStageSurface()
    const stageViewport = this.context.getStageViewport()
    const editorSetting = this.context.getEditorSetting()
    const elemDrawer = this.context.getElemDrawer()

    if (editorSetting.setting.ignoreUnVisible && this.optimize) {
      const visualSize = stageSurface.getVisualSize(this.aabb)
      if (visualSize.x < 2 && visualSize.y < 2) return
    }

    const resetCtx = stageSurface.setCurrentCtxType(
      this.type === 'widgetElem' ? 'topCanvas' : 'mainCanvas',
    )

    stageSurface.ctxSaveRestore((ctx) => {
      const path2d = new Path2D()
      let resetTransform = () => {}

      if (this.node) {
        resetTransform = stageSurface.setTransform(this.node.matrix)
        stageSurface.ctxSaveRestore(() => elemDrawer.draw(this, ctx, path2d))
      }

      if (this.children.length) {
        if (this.clip) ctx.clip(path2d)
        this.children.forEach((child) => child.traverseDraw())
      }

      resetTransform()
    })

    resetCtx()
  }

  parent!: Elem
  children: Elem[] = []

  addChild(elem: Elem, index?: number) {
    if (elem.parent === this) return

    elem.parent = this
    this.children.splice(index ?? this.children.length, 0, elem)
  }

  insertBefore(elem: Elem, beforeElem: Elem) {
    const index = this.children.indexOf(beforeElem)
    this.addChild(elem, index === -1 ? this.children.length : index)
  }

  removeChild(elem: Elem) {
    const index = this.children.indexOf(elem)
    if (index !== -1) this.children.splice(index, 1)
  }

  eventHandle = new ElemEventHandler(this)

  get hitTest() {
    return this.eventHandle.hitTest
  }
  set hitTest(hitTest: (xy: IXY) => boolean) {
    this.eventHandle.hitTest = hitTest
  }

  addEvent(
    type: ElemEventType,
    func: ElemEventFunc,
    option?: { capture?: boolean },
  ) {
    return this.eventHandle.addEvent(type, func, option)
  }

  removeEvent(
    type: ElemEventType,
    func: ElemEventFunc,
    option?: { capture?: boolean },
  ) {
    return this.eventHandle.removeEvent(type, func, option)
  }

  destroy() {
    this.eventHandle.dispose()
    this.parent?.removeChild(this)
    this.context.getStageSurface().collectDirty(this)
  }
}

export type ElemEventType = 'mousedown' | 'mousemove' | 'hover'

type ElemEventBase = {
  hostEvent: Event
  stopPropagation: () => void
}

export type ElemEvent = ElemMouseEvent

export type ElemMouseEvent = ElemEventBase & {
  xy: IXY
  hovered: boolean
  hostEvent: MouseEvent
}

export type ElemEventFunc = (e: ElemMouseEvent) => void

class ElemEventHandler {
  hitTest = (xy: IXY) => false
  private lastHit = [false, false]

  private mousedown: ElemEventFunc[][] = [[], []]
  private mousemove: ElemEventFunc[][] = [[], []]
  private hover: ElemEventFunc[][] = [[], []]
  private eventCount = 0

  constructor(private elem: Elem) {}

  private hitTestCache = new Map<string, (xy: IXY) => boolean>()

  cacheHitTest = (createHitTest: () => (xy: IXY) => boolean, deps: any[]) => {
    this.hitTest = getSet(this.hitTestCache, 'hitTest', createHitTest, deps)
  }

  addEvent = (
    type: ElemEventType,
    func: ElemEventFunc,
    option?: { capture?: boolean },
  ) => {
    const capture = option?.capture ? 0 : 1

    this[type][capture].push(func)
    this.eventCount++

    return () => {
      const index = this[type][capture].indexOf(func)
      if (index === -1) return

      this[type][capture].splice(index, 1)
      this.eventCount--
    }
  }

  removeEvent = (
    type: ElemEventType,
    func: ElemEventFunc,
    option?: { capture?: boolean },
  ) => {
    const capture = option?.capture ? 0 : 1
    const index = this[type][capture].indexOf(func)
    if (index === -1) return

    this[type][capture].splice(index, 1)
    this.eventCount--
  }

  dispose() {
    this.mousedown = [[], []]
    this.mousemove = [[], []]
    this.hover = [[], []]
    this.eventCount = 0
    this.hitTestCache.clear()
  }

  triggerMouseEvent = (
    e: MouseEvent,
    xy: IXY,
    hit: boolean,
    isCapture: boolean,
    stopPropagation: NoopFunc,
  ) => {
    if (this.eventCount === 0) return

    const capture = isCapture ? 0 : 1
    const mouseEvent = {
      xy,
      stopPropagation,
      hostEvent: e as MouseEvent,
    }

    switch (e.type) {
      case 'mousedown':
        if (hit) {
          this.mousedown[capture].forEach((func) =>
            func({ ...mouseEvent, hovered: true }),
          )
        }
        break

      case 'mousemove':
        if (hit) {
          this.mousemove[capture].forEach((func) =>
            func({ ...mouseEvent, hovered: true }),
          )
        }
        if (hit !== this.lastHit[capture]) {
          this.lastHit[capture] = hit
          this.hover[capture].forEach((func) =>
            func({ ...mouseEvent, hovered: hit }),
          )
        }
        break
    }
  }
}
