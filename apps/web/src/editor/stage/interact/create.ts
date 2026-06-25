import { IRect } from '@gitborlando/geo'
import type { DragData } from '@gitborlando/toolkit/browser'
import { Disposer } from '@gitborlando/toolkit/disposer'
import { clone } from '@gitborlando/utils'
import {
  HandleNode,
  SchemaCreator,
  StageCursor,
  StageInteract,
  StageScene,
  StageSelect,
  StageSurface,
  Undo,
  YState,
} from 'src/editor'
import {
  createLine,
  createRegularPolygon,
  createStarPolygon,
  Matrix,
  MRect,
} from 'src/editor/geometry'
import { SchemaHelper } from 'src/editor/schema/helper'
import { StageDrag } from 'src/editor/stage/interact/drag'
import { getSelectPageId, getZoom } from 'src/editor/utils/get'
import { snapGridRoundRect, snapGridRoundXY } from 'src/editor/utils/misc'

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

export class StageCreateService {
  createTypes = createTypes
  @observable createType: IStageCreateType = 'frame'
  private node!: S.Node
  private parent!: S.NodeParent

  startInteract() {
    const disposer = Disposer.combine(
      StageScene.sceneRoot.addEvent('mousedown', this.create, { capture: true }),
    )
    StageCursor.setCursor('add').lock()

    return () => {
      disposer()
      StageCursor.unlock().setCursor('select')
    }
  }

  private create() {
    StageDrag.onStart(this.onCreateStart)
      .onMove(this.onCreateMove)
      .onDestroy(this.onCreateEnd)
      .start()
  }

  private onCreateStart(dragData: DragData) {
    const size = 0.01 / getZoom()

    dragData = clone(dragData)
    dragData.current = XY.of(dragData.start).plusNum(size)
    dragData.marquee.width = size
    dragData.marquee.height = size

    this.parent = this.findParent()
    this.node = this.createNode(dragData)

    YState.transact(() => {
      HandleNode.addNodes([this.node])
      HandleNode.insertChildAt(this.parent, this.node)
    })

    StageSelect.onCreateSelect(this.node.id)
    StageSurface.disablePointEvent()

    if (this.createType === 'line') {
      StageCursor.setCursor('move').lock().upReset()
    }
  }

  private onCreateMove(dragData: DragData) {
    YState.transact(() => {
      this.updateNodeMRect(this.node, this.calcCreateMRect(dragData))
    })
  }

  private onCreateEnd({ moved }: DragData & { moved: boolean }) {
    if (!moved) {
      YState.transact(() => {
        this.updateNodeMRect(this.node, this.calcDefaultMRect())
      })
    }
    StageInteract.interaction = 'select'
    Undo.track('all', t('create node'))
  }

  private createNode(dragData: DragData) {
    const length = XY.distance(dragData.current, dragData.start)
    const mrect = this.calcCreateMRect(dragData)
    const node = SchemaCreator[this.createType]({
      name: SchemaCreator.createNodeName(this.createType),
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
    const snapRect = snapGridRoundRect(rect)
    const matrix = this.prependParentMatrix(Matrix.identity().shift(snapRect))

    return MRect.fromRect(snapRect, matrix)
  }

  private calcLineMRect(current: IXY, start: IXY) {
    current = snapGridRoundXY(current)
    start = snapGridRoundXY(start)

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
    YState.set<S.Node>([node.id, 'width'], mrect.width)
    YState.set<S.Node>([node.id, 'height'], mrect.height)
    YState.set<S.Node>([node.id, 'matrix'], mrect.matrix)

    const points = this.createNodePoints(node, mrect)
    if (points) YState.set<any>([node.id, 'points'], points)
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
    const frame = StageScene.elemsFromPoint().find((elem) =>
      SchemaHelper.isById(elem.id, 'frame'),
    )

    if (frame) return YState.find<S.NodeParent>(frame.id)
    return YState.find<S.Page>(getSelectPageId())
  }
}
