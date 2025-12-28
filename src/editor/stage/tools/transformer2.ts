import { AABB, IMatrix, OBB } from 'src/editor/math'
import { OperateGeometry } from 'src/editor/operate/geometry'
import { DesignGeometry } from 'src/editor/operate/geometry-d'
import { StageScene } from 'src/editor/render/scene'
import { SchemaHelper } from 'src/editor/schema/helper'
import { snapGridRound } from 'src/editor/utils'
import { getSelectedNodes } from 'src/editor/y-state/y-state'
import { StageDrag } from 'src/global/event/drag'

class StageTransformerService {
  obb = OBB.identity()
  @observable.ref mrect = MRect.identity()
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
      const matrix = SchemaHelper.getSceneMatrix(selectNodes[0])
      return this.mrect.from({
        width: selectNodes[0].width,
        height: selectNodes[0].height,
        matrix,
      })
    }
    return this.mrect
  }

  move(e: MouseEvent) {
    const originalAABB = this.mrect.aabb
    let lastMatrix: IMatrix | undefined = undefined

    StageDrag.onMove(({ shift }) => {
      this.isMoving = true

      const aabb = AABB.shift(originalAABB, shift)
      const snapDelta = XY.$(
        snapGridRound(aabb.minX) - aabb.minX,
        snapGridRound(aabb.minY) - aabb.minY,
      )

      const newMatrix = Matrix.identity().shift(shift).shift(snapDelta)
      const div = Matrix.of(newMatrix).divide(lastMatrix || Matrix.identity())
      lastMatrix = newMatrix

      DesignGeometry.setGeometries({}, { matrix: div.plain() })
    })
      .onDestroy(({ moved }) => {
        this.isMoving = false
        if (!moved) return

        YUndo.track2('state', sentence(t('verb.move'), t('noun.node')))
      })
      .start()
  }

  private applyToNodes() {
    const nodes = getSelectedNodes()

    for (const node of nodes) {
    }
  }

  onDragLine(type: 'top' | 'bottom' | 'left' | 'right', e: MouseEvent) {
    const { setActiveGeometry, setActiveGeometries, activeGeometry } =
      OperateGeometry
    const { rotation } = activeGeometry

    StageDrag.onMove(({ delta }) => {
      const deltaX = XY.dot(delta, XY.xAxis(rotation))
      const deltaY = XY.dot(delta, XY.yAxis(rotation))

      if (this.isSelectOnlyLine) {
        setActiveGeometry('x', XY.dot(delta, XY.xAxis(0)))
        setActiveGeometry('y', XY.dot(delta, XY.yAxis(0)))
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
      .start()
  }
}

export const StageTransformer2 = autoBind(
  makeObservable(new StageTransformerService()),
)
