import { Service } from '@gitborlando/di-service'
import { IRect } from '@gitborlando/geo'
import { Signal } from '@gitborlando/signal'
import type { DragData } from '@gitborlando/toolkit/browser'
import { clone, iife } from '@gitborlando/utils'
import { makeObservable } from 'mobx'
import { SelectAction } from 'src/editor/action/select'
import { Undo } from 'src/editor/action/undo'
import { DocCreator } from 'src/editor/doc/creator'
import { findParent } from 'src/editor/doc/finder'
import { DocHelper } from 'src/editor/doc/helper'
import { DocMutator } from 'src/editor/doc/mutator'
import { createLine, Matrix, MRect } from 'src/editor/geometry'
import { RenderTree } from 'src/editor/render/tree'
import { Select } from 'src/editor/select'
import { Setting } from 'src/editor/setting'
import { StageCursor } from 'src/editor/stage/cursor'
import { createStageDragger } from 'src/editor/stage/dragger'
import { StageEvent } from 'src/editor/stage/event'
import { StageViewport } from 'src/editor/stage/viewport'
import { snapGridRoundRect, snapGridRoundXY } from 'src/editor/utils'
import { YDoc } from 'src/editor/y-adapter/y-doc'
import { GRAPHS } from 'src/shared/constant'

const createTypes = ['frame', 'rect', 'ellipse', 'line', 'text'] as const
export type IStageCreateType = (typeof createTypes)[number]

const defaultCreateSize = 100

@reflection
export class StageCreate extends Service {
  createTypes = createTypes
  @observable createType: IStageCreateType = 'frame'

  private node!: S.Node
  private parent!: S.Parent

  finishCreate$ = Signal.create<void>()

  constructor(
    private readonly renderTree: RenderTree,
    private readonly stageEvent: StageEvent,
    private readonly stageCursor: StageCursor,
    private readonly docMutator: DocMutator,
    private readonly undo: Undo,
    private readonly docCreator: DocCreator,
    private readonly yDoc: YDoc,
    private readonly select: Select,
    private readonly stageViewport: StageViewport,
    private readonly setting: Setting,
    private readonly selectAction: SelectAction,
  ) {
    super()
    autoBind(makeObservable(this))
  }

  startInteract() {
    const disposer = this.renderTree.sceneRoot.addEvent('mousedown', this.create)
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

    this.yDoc.transact(() => {
      this.docMutator.addNodes([this.node])
      this.docMutator.insertChildAt(this.parent, this.node)
    })

    this.selectAction.onCreateSelect(this.node.id)
    this.stageEvent.disablePointEvent()

    if (this.createType === 'line') {
      this.stageCursor.setCursor('move').lock().upReset()
    }
  }

  private onCreateMove(dragData: DragData) {
    this.yDoc.transact(() => {
      this.updateNodeMRect(this.node, this.calcCreateMRect(dragData))
    })
  }

  private onCreateEnd({ moved }: DragData & { moved: boolean }) {
    if (!moved) {
      this.yDoc.transact(() => {
        this.updateNodeMRect(this.node, this.calcDefaultMRect())
      })
    }
    this.finishCreate$.dispatch()
    this.undo.track('all', t('create node'))
  }

  private createNode(dragData: DragData) {
    const length = XY.distance(dragData.current, dragData.start)
    const mrect = this.calcCreateMRect(dragData)
    const node = this.docCreator[this.createType]({
      name: this.docCreator.createNodeName(this.createType),
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
    const forwardMatrix = iife(() => {
      const parent = this.parent
      if (!DocHelper.isPage(parent)) return Matrix.of(parent.matrix)
      return Matrix.identity()
    })
    return forwardMatrix.invert().append(matrix).plain()
  }

  private updateNodeMRect(node: S.Node, mrect: MRect) {
    this.yDoc.set<S.Node>([GRAPHS, node.id, 'width'], mrect.width)
    this.yDoc.set<S.Node>([GRAPHS, node.id, 'height'], mrect.height)
    this.yDoc.set<S.Node>([GRAPHS, node.id, 'matrix'], mrect.matrix)

    const points = this.createNodePoints(node, mrect)
    if (points) this.yDoc.set<S.Vector>([GRAPHS, node.id, 'points'], points)
  }

  private createNodePoints(node: S.Node, mrect: MRect) {
    if (DocHelper.isNode(node, 'line')) {
      return createLine(XY.$(0, 0), mrect.width)
    }
  }

  private findParent() {
    const frame = this.stageEvent.hitSceneElems.find((elem) =>
      DocHelper.isNode(elem.node, 'frame'),
    )
    if (frame) return findParent(frame.id)
    return this.select.getSelectedPage()
  }
}
