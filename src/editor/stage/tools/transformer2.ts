import { AABB, OBB } from 'src/editor/math'
import { OperateGeometry } from 'src/editor/operate/geometry'
import { DesignGeometry } from 'src/editor/operate/geometry-d'
import { StageScene } from 'src/editor/render/scene'
import { SchemaHelper } from 'src/editor/schema/helper'
import { snapGridRound } from 'src/editor/utils'
import { StageDrag } from 'src/global/event/drag'

class StageTransformerService {
  obb = OBB.identity()
  @observable.ref mrect = MRect.identity()
  @observable.ref diffMatrix = Matrix.identity()
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
      return (this.mrect = MRect.fromRect(selectNodes[0], matrix))
    }

    const aabbList = selectNodes.map((node) => {
      const matrix = SchemaHelper.getSceneMatrix(node)
      return MRect.fromRect(node, matrix).aabb
    })
    const rect = AABB.rect(AABB.merge(aabbList))
    this.mrect = MRect.fromRect(rect, Matrix.identity().shift(rect))
    return this.mrect
  }

  move(e: MouseEvent) {
    const startAABB = this.mrect.aabb
    const startMatrix = this.mrect.matrix

    DesignGeometry.onStartSetGeometries()

    StageDrag.onMove(({ shift }) => {
      this.isMoving = true

      const aabb = AABB.shift(startAABB, shift)
      const snapDelta = XY.$(
        snapGridRound(aabb.minX) - aabb.minX,
        snapGridRound(aabb.minY) - aabb.minY,
      )

      const newMatrix = Matrix.of(startMatrix).shift(shift).shift(snapDelta)
      this.diffMatrix = newMatrix.divide(startMatrix)

      DesignGeometry.setGeometries({}, { matrix: this.diffMatrix.plain() })
    })
      .onDestroy(({ moved }) => {
        this.isMoving = false
        DesignGeometry.onEndSetGeometries()

        if (moved) {
          YUndo.track2('state', sentence(t('verb.move'), t('noun.node')))
        }
      })
      .start(e)
  }

  onDragLine2(
    type: 'T' | 'B' | 'L' | 'R',
    options?: {
      e?: MouseEvent
    },
  ) {
    const rotation = this.mrect.rotation
    const starWidth = this.mrect.width
    const starHeight = this.mrect.height

    StageDrag.start(options?.e).onMove(({ shift }) => {
      const shiftX = XY.dot(shift, XY.xAxis(rotation))
      const shiftY = XY.dot(shift, XY.yAxis(rotation))
      const scaleX = shiftX / starWidth
      const scaleY = shiftY / starHeight

      switch (type) {
        case 'T':
          break
      }
    })
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
