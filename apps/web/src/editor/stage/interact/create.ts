import { IRect } from '@gitborlando/geo'
import { Signal } from '@gitborlando/signal'
import type { DragData } from '@gitborlando/toolkit/browser'
import { clone } from '@gitborlando/utils'
import { makeObservable } from 'mobx'
import { SelectController } from 'src/editor/controller/select'
import { SettingService } from 'src/editor/core/setting'
import { UndoService } from 'src/editor/core/undo'
import {
  createLine,
  createRegularPolygon,
  createStarPolygon,
  Matrix,
  MRect,
} from 'src/editor/geometry'
import { HandleNodeService } from 'src/editor/handle/node'
import { HandleSelectService } from 'src/editor/handle/select'
import { RenderTreeService } from 'src/editor/render/tree'
import { SchemaCreatorService } from 'src/editor/schema/creator'
import { SchemaHelper } from 'src/editor/schema/helper'
import { StageCursorService } from 'src/editor/stage/cursor'
import { createStageDragger } from 'src/editor/stage/dragger'
import { StageEventService } from 'src/editor/stage/event'
import { StageViewportService } from 'src/editor/stage/viewport'
import {
  snapGridRoundRectBySetting,
  snapGridRoundXYBySetting,
} from 'src/editor/utils/misc'
import { YStateService } from 'src/editor/y-adapter/y-state'
import { Service } from 'src/global/service'

const createTypes = [
  'frame',
  'rect',
  'ellipse',
  'line',
  'polygon',
  'star',
  'text',
] as const
export type IStageCreateType = (typeof createTypes)[number]

const defaultCreateSize = 100

export class StageCreateService extends Service {
  createTypes = createTypes
  @observable createType: IStageCreateType = 'frame'

  private node!: S.Node
  private parent!: S.NodeParent

  finishCreate$ = Signal.create<void>()

  constructor(
    private readonly renderTree: RenderTreeService,
    private readonly stageEvent: StageEventService,
    private readonly stageCursor: StageCursorService,
    private readonly handleNode: HandleNodeService,
    private readonly undo: UndoService,
    private readonly schemaCreator: SchemaCreatorService,
    private readonly yState: YStateService,
    private readonly handleSelect: HandleSelectService,
    private readonly stageViewport: StageViewportService,
    private readonly setting: SettingService,
    private readonly selectController: SelectController,
  ) {
    super()
    autoBind(makeObservable(this))
  }

  startInteract() {
    const disposer = this.renderTree.sceneRoot.addEvent('mousedown', this.create, {
      capture: true,
    })
    this.stageCursor.setCursor('add').lock()

    return () => {
      disposer()
      this.stageCursor.unlock().setCursor('select')
    }
  }

  private create() {
    createStageDragger(this.stageViewport)
      .onStart(this.onCreateStart)
      .onMove(this.onCreateMove)
      .onDestroy(this.onCreateEnd)
      .start()
  }

  private onCreateStart(dragData: DragData) {
    const size = 0.01 / this.stageViewport.zoom

    dragData = clone(dragData)
    dragData.current = XY.of(dragData.start).plusNum(size)
    dragData.marquee.width = size
    dragData.marquee.height = size

    this.parent = this.findParent()
    this.node = this.createNode(dragData)

    this.yState.transact(() => {
      this.handleNode.addNodes([this.node])
      this.handleNode.insertChildAt(this.parent, this.node)
    })

    this.selectController.onCreateSelect(this.node.id)
    this.stageEvent.disablePointEvent()

    if (this.createType === 'line') {
      this.stageCursor.setCursor('move').lock().upReset()
    }
  }

  private onCreateMove(dragData: DragData) {
    this.yState.transact(() => {
      this.updateNodeMRect(this.node, this.calcCreateMRect(dragData))
    })
  }

  private onCreateEnd({ moved }: DragData & { moved: boolean }) {
    if (!moved) {
      this.yState.transact(() => {
        this.updateNodeMRect(this.node, this.calcDefaultMRect())
      })
    }
    this.finishCreate$.dispatch()
    this.undo.track('all', t('create node'))
  }

  private createNode(dragData: DragData) {
    const length = XY.distance(dragData.current, dragData.start)
    const mrect = this.calcCreateMRect(dragData)
    const node = this.schemaCreator[this.createType]({
      name: this.schemaCreator.createNodeName(this.createType),
      ...mrect.plain(),
      ...(this.createType === 'line' && { width: length }),
    })

    return node
  }

  private calcCreateMRect({ marquee, current, start }: DragData) {
    if (this.createType === 'line') {
      return this.calcLineMRect(current, start)
    }
    return this.calcNodeMRect(marquee)
  }

  private calcDefaultMRect() {
    const height = this.createType === 'line' ? 0 : defaultCreateSize
    return new MRect(defaultCreateSize, height, this.node.matrix)
  }

  private calcNodeMRect(rect: IRect) {
    const snapRect = snapGridRoundRectBySetting(this.setting.snapToGrid, rect)
    const matrix = this.prependParentMatrix(Matrix.identity().shift(snapRect))

    return MRect.fromRect(snapRect, matrix)
  }

  private calcLineMRect(current: IXY, start: IXY) {
    current = snapGridRoundXYBySetting(this.setting.snapToGrid, current)
    start = snapGridRoundXYBySetting(this.setting.snapToGrid, start)

    const width = XY.distance(current, start)
    const rotation = Angle.sweep(XY.vector(current, start))
    const matrix = this.prependParentMatrix(
      Matrix.identity().rotate(rotation).shift(start),
    )

    return new MRect(width, 0, matrix)
  }

  private prependParentMatrix(matrix: Matrix) {
    const forwardMatrix =
      this.parent.type === 'page' ? Matrix.identity() : Matrix.of(this.parent.matrix)
    return forwardMatrix.invert().append(matrix).plain()
  }

  private updateNodeMRect(node: S.Node, mrect: MRect) {
    this.yState.set<S.Node>([node.id, 'width'], mrect.width)
    this.yState.set<S.Node>([node.id, 'height'], mrect.height)
    this.yState.set<S.Node>([node.id, 'matrix'], mrect.matrix)

    const points = this.createNodePoints(node, mrect)
    if (points) this.yState.set<any>([node.id, 'points'], points)
  }

  private createNodePoints(node: S.Node, mrect: MRect) {
    if (SchemaHelper.is(node, 'line')) {
      return createLine(XY.$(0, 0), mrect.width)
    }
    if (SchemaHelper.is(node, 'polygon')) {
      return createRegularPolygon(mrect.width, mrect.height, node.sides)
    }
    if (SchemaHelper.is(node, 'star')) {
      return createStarPolygon(
        mrect.width,
        mrect.height,
        node.pointCount,
        node.innerRate,
      )
    }
  }

  private findParent() {
    const frame = this.stageEvent
      .getElemsFromPoint()
      .filter((elem) => elem.type === 'sceneElem')
      .find((elem) => SchemaHelper.isById(elem.id, 'frame'))

    if (frame) return this.yState.find<S.NodeParent>(frame.id)
    return this.yState.find<S.Page>(this.handleSelect.selectPageId)
  }
}
