import { DragData } from '@gitborlando/utils/browser'
import { HandleNode } from 'src/editor/handle/node'
import { OperateGeometry } from 'src/editor/operate/geometry'
import { StageScene } from 'src/editor/render/scene'
import { StageSurface } from 'src/editor/render/surface'
import { SchemaCreator } from 'src/editor/schema/creator'
import { StageCursor } from 'src/editor/stage/cursor'
import { snapGridRound, snapGridRoundXY } from 'src/editor/utils'
import { StageDrag } from 'src/global/event/drag'
import { IXY } from 'src/shared/utils/normal'
import { SchemaUtil } from 'src/shared/utils/schema'
import { getZoom } from '../viewport'
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
  private moved = false

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
  }

  private onCreateStart({ start }: DragData) {
    this.node = this.createNode(start)

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

      const rotation = Angle.sweep(XY.vectorOf(current, start))
      const width = XY.distanceOf(current, start)

      OperateGeometry.setActiveGeometries({ ...start, width, rotation }, false)
    } else {
      const { x, y, width, height } = marquee

      OperateGeometry.setActiveGeometries(
        {
          x: snapGridRound(x),
          y: snapGridRound(y),
          width: snapGridRound(width),
          height: snapGridRound(height),
        },
        false,
      )
    }
  }

  private onCreateEnd({ moved }: DragData & { moved: boolean }) {
    if (!moved) {
      YState.set(`${this.node.id}.width`, 100)
      if (this.node.type !== 'line') {
        YState.set(`${this.node.id}.height`, 100)
      }
    }
    YState.next()
    StageInteract.interaction = 'select'

    YUndo.track2('all', t('created node'))
  }

  private createNode({ x, y }: IXY) {
    const size = 0.01 / getZoom()
    const node = SchemaCreator[this.currentType]({ x, y, width: size, height: size })

    node.name = SchemaCreator.createNodeName(this.currentType)
    this.node = node

    return node
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
