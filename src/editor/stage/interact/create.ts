import { DragData } from '@gitborlando/utils/browser'
import { HandleNode } from 'src/editor/handle/node'
import { IRect } from 'src/editor/math'
import { StageScene } from 'src/editor/render/scene'
import { StageSurface } from 'src/editor/render/surface'
import { SchemaCreator } from 'src/editor/schema/creator'
import { StageCursor } from 'src/editor/stage/cursor'
import { getZoom } from 'src/editor/stage/viewport'
import { snapGridRoundXY } from 'src/editor/utils'
import { StageDrag } from 'src/global/event/drag'
import { SchemaUtil } from 'src/shared/utils/schema'
import { StageInteract } from './interact'
import { StageSelect } from './select'

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

class StageCreateService {
  createTypes = createTypes
  @observable currentType: IStageCreateType = 'frame'
  private node!: V1.Node
  private parent!: V1.NodeParent

  startInteract() {
    const disposer = Disposer.collect(
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

  private onCreateStart({ start }: DragData) {
    const size = 0.01 / getZoom()
    this.parent = this.findParent()
    this.node = this.createNode({ ...start, width: size, height: size })

    HandleNode.addNodes([this.node])
    HandleNode.insertChildAt(this.findParent(), this.node)

    StageSelect.onCreateSelect(this.node.id)
    StageSurface.disablePointEvent()

    if (this.node.type === 'line') {
      StageCursor.setCursor('move').lock().upReset()
    }
  }

  private onCreateMove({ marquee, current, start }: DragData) {
    if (this.node.type === 'line') {
      current = snapGridRoundXY(current)
      start = snapGridRoundXY(start)

      const rotation = Angle.sweep(XY.vector(current, start))
      const width = XY.distance(current, start)

      // OperateGeometry.setActiveGeometries({ ...start, width, rotation }, false)
    } else {
      const mrect = this.calcNodeMRect(marquee)

      YState.set(`${this.node.id}.width`, mrect.width)
      YState.set(`${this.node.id}.height`, mrect.height)
      YState.set(`${this.node.id}.matrix`, mrect.matrix)
    }
    YState.next()
  }

  private onCreateEnd({ moved }: DragData & { moved: boolean }) {
    if (!moved) {
      YState.set(`${this.node.id}.width`, 100)
      if (this.node.type !== 'line') {
        YState.set(`${this.node.id}.height`, 100)
      }
      YState.next()
    }

    StageInteract.interaction = 'select'
    YUndo.track2('all', t('created node'))
  }

  private createNode(rect: IRect) {
    const mrect = this.calcNodeMRect(rect)
    const node = SchemaCreator[this.currentType]({
      ...mrect.plain(),
    })
    node.name = SchemaCreator.createNodeName(this.currentType)
    this.node = node

    return node
  }

  private calcNodeMRect(rect: IRect) {
    const forwardMatrix =
      this.parent.type === 'page' ? Matrix.identity() : Matrix.of(this.parent.matrix)
    const matrix = forwardMatrix
      .invert()
      .append(Matrix.identity().shift(snapGridRoundXY(rect)))

    return MRect.fromRect(rect, matrix.plain())
  }

  private findParent() {
    const frame = StageScene.elemsFromPoint().find((elem) =>
      SchemaUtil.isById(elem.id, 'frame'),
    )
    if (frame) return YState.find<V1.NodeParent>(frame.id)
    return YState.find<V1.Page>(YClients.client.selectPageId)
  }
}

export const StageCreate = autoBind(makeObservable(new StageCreateService()))
