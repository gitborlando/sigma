import { createCache, iife } from '@gitborlando/utils'
import { AABB, IMRect } from 'src/editor/math'
import { SchemaHelper } from 'src/editor/schema/helper'
import { snapGridRound, TRBL } from 'src/editor/utils'
import { getSelectIdList } from 'src/editor/y-state/y-clients'
import { getSelectedNodes } from 'src/editor/y-state/y-state'
import { StageDrag } from 'src/global/event/drag'

type TransformerAction = 'move' | 'resize' | 'rotate'

class StageTransformerService {
  @observable.ref mrect = MRect.identity()
  @observable.ref diffMatrix = Matrix.identity()
  @observable isMoving = false

  @computed get isSingleSelect() {
    return getSelectIdList().length === 1
  }

  private action: TransformerAction = 'move'
  isSelectOnlyLine = false

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
    const { startMRect, startMatrix } = this.onStartTransform()
    const startAABB = startMRect.aabb

    StageDrag.onMove(({ shift }) => {
      this.action = 'move'
      this.isMoving = true

      const aabb = AABB.shift(startAABB, shift)
      const snapDelta = XY.$(
        snapGridRound(aabb.minX) - aabb.minX,
        snapGridRound(aabb.minY) - aabb.minY,
      )

      const newMatrix = Matrix.of(startMatrix).shift(shift).shift(snapDelta)
      this.diffMatrix = newMatrix.divide(startMatrix)

      this.transform()
    })
      .onDestroy(({ moved }) => {
        this.isMoving = false
        this.onEndTransform()
        if (moved) {
          YUndo.track2('state', sentence(t('verb.move'), t('noun.node')))
        }
      })
      .start(e)
  }

  onResize(
    directions: TRBL[],
    options?: {
      e?: MouseEvent
      shiftKey?: boolean
    },
  ) {
    const { startMRect, startMatrix } = this.onStartTransform()
    const endMatrix = Matrix.of(startMatrix)

    StageDrag.onMove(({ shift }) => {
      this.action = 'resize'
      shift = Matrix.of(startMRect.matrix).applyShift(shift, true)

      const { tx, ty, scaleX, scaleY } = iife(() => {
        let width = startMRect.width
        let height = startMRect.height
        let tx = startMatrix.tx
        let ty = startMatrix.ty
        const maxShift = Math.max(shift.x, shift.y)
        const shiftX = options?.shiftKey ? maxShift : shift.x
        const shiftY = options?.shiftKey ? maxShift : shift.y
        if (directions.includes('left')) {
          width -= shiftX
          tx += shiftX
        }
        if (directions.includes('top')) {
          height -= shiftY
          ty += shiftY
        }
        if (directions.includes('right')) width += shiftX
        if (directions.includes('bottom')) height += shiftY
        const scaleX = width / startMRect.width
        const scaleY = height / startMRect.height
        return { tx, ty, scaleX, scaleY }
      })

      endMatrix.set({ a: scaleX, d: scaleY, tx: tx, ty: ty })
      this.diffMatrix = Matrix.of(endMatrix).divide(startMatrix)

      this.transform()
    })
      .onDestroy(({ moved }) => {
        this.onEndTransform()
        if (moved) {
          YUndo.track2('state', sentence(t('verb.move'), t('noun.node')))
        }
      })
      .start(options?.e)
  }

  onRotate() {
    const { startMRect } = this.onStartTransform()
    const startRect = AABB.rect(startMRect.aabb)
    const startMatrix = Matrix.identity().shift(startRect)

    StageDrag.onMove(({ current, start }) => {
      this.action = 'rotate'

      const rotation = Angle.sweep(
        XY.vector(current, startMRect.center),
        XY.vector(start, startMRect.center),
      )
      const aabbMRect = MRect.fromRect(startRect, startMatrix)
      const endMatrix = aabbMRect.rotate(rotation).matrix
      this.diffMatrix = Matrix.of(endMatrix).divide(startMatrix)

      this.transform()
    })
      .onDestroy(({ moved }) => {
        this.onEndTransform()
        if (moved) {
          YUndo.track2('state', sentence(t('verb.rotate'), t('noun.node')))
        }
      })
      .start()
  }

  private mrectCache = createCache<ID, IMRect>()

  private onStartTransform() {
    getSelectedNodes().forEach((node) => {
      this.mrectCache.set(node.id, MRect.of(node))
    })
    const startMRect = this.mrect.clone()
    const startMatrix = this.isSingleSelect
      ? Matrix.identity()
      : Matrix.of(startMRect.matrix)
    return { startMRect, startMatrix }
  }

  private transform() {
    getSelectedNodes().forEach(this.applyToNode)
    YState.next()
  }

  private onEndTransform() {
    this.mrectCache.clear()
    this.diffMatrix = Matrix.identity()
  }

  private applyToNode(node: V1.Node) {
    const mrect = this.mrectCache.get(node.id)
    if (!this.diffMatrix || !mrect) return

    const startMRect = MRect.of(mrect)
    const forwardMatrix = SchemaHelper.getForwardAccumulatedMatrix(node)

    if (getSelectIdList().length === 1 && this.action === 'resize') {
      startMRect.transform(this.diffMatrix, true)
    } else {
      const localDiff = Matrix.of(forwardMatrix)
        .invert()
        .append(this.diffMatrix)
        .append(forwardMatrix)
      startMRect.transform(localDiff)
    }

    YState.set(`${node.id}.width`, startMRect.width)
    YState.set(`${node.id}.height`, startMRect.height)
    YState.set(`${node.id}.matrix`, startMRect.matrix)
  }
}

export const StageTransformer = autoBind(
  makeObservable(new StageTransformerService()),
)
