import { IRect } from '@gitborlando/geo'
import { Signal } from '@gitborlando/signal'
import type { DragData } from '@gitborlando/toolkit/browser'
import { clone } from '@gitborlando/utils'
import { makeObservable } from 'mobx'
import { SelectController } from 'src/editor/controller/select'
import { Setting } from 'src/editor/core/setting'
import { Undo } from 'src/editor/core/undo'
import { createLine, Matrix, MRect } from 'src/editor/geometry'
import { HandleNode } from 'src/editor/handle/node'
import { HandleSelect } from 'src/editor/handle/select'
import { RenderTree } from 'src/editor/render/tree'
import { SchemaCreator } from 'src/editor/schema/creator'
import { SchemaHelper } from 'src/editor/schema/helper'
import { StageCursor } from 'src/editor/stage/cursor'
import { createStageDragger } from 'src/editor/stage/dragger'
import { StageEvent } from 'src/editor/stage/event'
import { StageViewport } from 'src/editor/stage/viewport'
import { snapGridRoundRect, snapGridRoundXY } from 'src/editor/utils/misc'
import { YState } from 'src/editor/y-adapter/y-state'
import { Service } from 'src/global/service'

const createTypes = ['frame', 'rect', 'ellipse', 'line', 'text'] as const
export type IStageCreateType = (typeof createTypes)[number]

const defaultCreateSize = 100

@reflection
export class StageCreate extends Service {
  createTypes = createTypes
  @observable createType: IStageCreateType = 'frame'

  private node!: S.Node
  private parent!: S.NodeParent

  finishCreate$ = Signal.create<void>()

  constructor(
    private readonly renderTree: RenderTree,
    private readonly stageEvent: StageEvent,
    private readonly stageCursor: StageCursor,
    private readonly handleNode: HandleNode,
    private readonly undo: Undo,
    private readonly schemaCreator: SchemaCreator,
    private readonly yState: YState,
    private readonly handleSelect: HandleSelect,
    private readonly stageViewport: StageViewport,
    private readonly setting: Setting,
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
    const snapRect = snapGridRoundRect(rect, this.setting.snapToGrid)
    const matrix = this.prependParentMatrix(Matrix.identity().shift(snapRect))

    return MRect.fromRect(snapRect, matrix)
  }

  private calcLineMRect(current: IXY, start: IXY) {
    current = snapGridRoundXY(current, this.setting.snapToGrid)
    start = snapGridRoundXY(start, this.setting.snapToGrid)

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
