import { AABB, OBB } from 'src/editor/math'
import { OperateGeometry } from 'src/editor/operate/geometry'
import { StageScene } from 'src/editor/render/scene'
import { snapGridRound } from 'src/editor/utils'
import { StageDrag } from 'src/global/event/drag'

class StageTransformerService {
  obb = OBB.identity()
  width = 0
  height = 0
  matrix = Matrix().matrix

  @observable isMoving = false

  isSelectOnlyLine = false

  calcOBB(selectNodes: V1.Node[]) {
    if (selectNodes.length === 0) {
      return (this.obb = OBB.identity())
    }
    if (selectNodes.length === 1) {
      return (this.obb = OBB.fromRect(selectNodes[0], selectNodes[0].rotation))
    }
    return (this.obb = OBB.fromAABB(
      AABB.merge(selectNodes.map((node) => StageScene.findElem(node.id).obb.aabb)),
    ))
  }

  setup(selectNodes: V1.Node[]) {
    if (selectNodes.length === 1) {
      this.width = selectNodes[0].width
      this.height = selectNodes[0].height
      this.matrix = selectNodes[0].matrix
    }
  }

  move(e: MouseEvent) {
    const originalObb = this.obb.clone()

    StageDrag.onStart()
      .onMove(({ shift }) => {
        this.isMoving = true

        const obb = originalObb.clone().shift(shift)
        const aabb = AABB.fromOBB(obb)
        const snapDelta = XY._(
          snapGridRound(aabb.minX) - aabb.minX,
          snapGridRound(aabb.minY) - aabb.minY,
        )
        obb.shift(snapDelta)

        const finalDeltaXY = XY.of(obb).minus(this.obb).xy
        OperateGeometry.setActiveGeometries(finalDeltaXY)
      })
      .onDestroy(({ moved }) => {
        this.isMoving = false
        if (!moved) return
        YUndo.track2('state', sentence(t('verb.move'), t('noun.node')))
      })
  }

  onDragLine(type: 'top' | 'bottom' | 'left' | 'right', e: MouseEvent) {
    const { setActiveGeometry, setActiveGeometries, activeGeometry } =
      OperateGeometry
    const { rotation } = activeGeometry

    StageDrag.onStart()
      .onMove(({ delta }) => {
        const deltaX = XY.of(delta).dot(XY.xAxis(rotation))
        const deltaY = XY.of(delta).dot(XY.yAxis(rotation))

        if (this.isSelectOnlyLine) {
          setActiveGeometry('x', XY.of(delta).dot(XY.xAxis(0)))
          setActiveGeometry('y', XY.of(delta).dot(XY.yAxis(0)))
          return
        }

        if (e.shiftKey) {
          switch (type) {
            case 'top':
              setActiveGeometry('x', -(deltaY / 2) * Angle.sin(rotation))
              setActiveGeometry('y', (deltaY / 2) * Angle.cos(rotation))
              setActiveGeometry('height', -deltaY)
              setActiveGeometry('height', -deltaY)
              break
            case 'right':
              setActiveGeometry('width', deltaX)
              setActiveGeometry('x', (-deltaX / 2) * Angle.cos(rotation))
              setActiveGeometry('y', (-deltaX / 2) * Angle.sin(rotation))
              setActiveGeometry('width', -deltaX)
              break
            case 'bottom':
              setActiveGeometry('height', +deltaY)
              setActiveGeometry('x', (-deltaY / 2) * Angle.sin(rotation))
              setActiveGeometry('y', (-deltaY / 2) * Angle.cos(rotation))
              setActiveGeometry('height', -(-deltaY))
              break
            case 'left':
              setActiveGeometry('x', (deltaX / 2) * Angle.cos(rotation))
              setActiveGeometry('y', (deltaX / 2) * Angle.sin(rotation))
              setActiveGeometry('width', deltaX)
              setActiveGeometry('width', -deltaX)
              break
          }
        } else {
          switch (type) {
            case 'top':
              setActiveGeometry('x', -deltaY * Angle.sin(rotation))
              setActiveGeometry('y', deltaY * Angle.cos(rotation))
              setActiveGeometry('height', -deltaY)
              break
            case 'right':
              setActiveGeometry('width', deltaX)
              break
            case 'bottom':
              setActiveGeometry('height', deltaY)
              break
            case 'left':
              setActiveGeometries({
                x: deltaX * Angle.cos(rotation),
                y: deltaX * Angle.sin(rotation),
                width: -deltaX,
              })
              break
          }
        }
      })
      .onDestroy(({ moved }) => {
        if (!moved) return

        YUndo.track2('state', sentence(t('verb.scale'), t('noun.node')))
      })
  }
}

export const StageTransformer = autoBind(
  makeObservable(new StageTransformerService()),
)
