import { Dragger } from '@gitborlando/toolkit/browser'
import { iife } from '@gitborlando/utils'
import { makeObservable } from 'mobx'
import { NodeController } from 'src/editor/controller/node'
import { Setting } from 'src/editor/core/setting'
import { Undo } from 'src/editor/core/undo'
import { IMRect, Matrix, MRect } from 'src/editor/geometry'
import { SchemaHelper } from 'src/editor/schema/helper'
import { createStageDragger } from 'src/editor/stage/dragger'
import { StageViewport } from 'src/editor/stage/viewport'
import { snapGridRound, TRBL } from 'src/editor/utils/misc'
import { YState } from 'src/editor/y-adapter/y-state'
import { Service } from 'src/global/service'

type TransformerAction = 'move' | 'resize' | 'rotate'

interface AxisPositionOptions {
  startSelectionMin: number
  startSelectionSize: number
  startNodeMin: number
  startNodeSize: number
  endSelectionMin: number
  endSelectionSize: number
  endNodeSize: number
  flipped: boolean
  fallbackAnchor: number
}

const calculateAxisPosition = ({
  startSelectionMin,
  startSelectionSize,
  startNodeMin,
  startNodeSize,
  endSelectionMin,
  endSelectionSize,
  endNodeSize,
  flipped,
  fallbackAnchor,
}: AxisPositionOptions) => {
  const startFreeSpace = startSelectionSize - startNodeSize
  let anchor =
    Math.abs(startFreeSpace) < 1e-6
      ? fallbackAnchor
      : (startNodeMin - startSelectionMin) / startFreeSpace

  anchor = Math.max(0, Math.min(1, anchor))
  if (flipped) anchor = 1 - anchor

  return endSelectionMin + anchor * (endSelectionSize - endNodeSize)
}

@reflection
export class StageTransformer extends Service {
  @observable.ref mrect = MRect.identity()
  @observable.ref diffMatrix = Matrix.identity()
  @observable isMoving = false

  @computed get isSingleSelect() {
    return this.nodeController.selectNodes.length === 1
  }

  isSelectOnlyLine = false

  private action: TransformerAction = 'move'
  private isResizing = false
  private keepRatioScale = 1 // 锁定比例节点的统一缩放倍率
  private scaleX = 1 // 选择框横向缩放倍率，用于保留翻转方向
  private scaleY = 1 // 选择框纵向缩放倍率，用于保留翻转方向
  private resizeStartMRect = MRect.identity()
  private resizeDirections: TRBL[] = []

  private dragger!: Dragger

  constructor(
    private readonly yState: YState,
    private readonly undo: Undo,
    private readonly stageViewport: StageViewport,
    private readonly setting: Setting,
    private readonly nodeController: NodeController,
  ) {
    super()
    autoBind(makeObservable(this))
    this.dragger = createStageDragger(this.stageViewport)
  }

  setup(selectNodes: S.Node[]) {
    if (this.isResizing) return this.mrect

    if (selectNodes.length === 1) {
      const node = selectNodes[0]
      const matrix = SchemaHelper.getSceneMatrix(node)
      return (this.mrect = MRect.of({ ...node, matrix }))
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

    this.dragger
      .onMove(({ shift }) => {
        this.action = 'move'
        this.isMoving = true

        const aabb = AABB.shift(startAABB, shift)
        const snapDelta = XY.$(
          snapGridRound(aabb.minX, this.setting.snapToGrid) - aabb.minX,
          snapGridRound(aabb.minY, this.setting.snapToGrid) - aabb.minY,
        )

        const newMatrix = Matrix.of(startMatrix).shift(shift).shift(snapDelta)
        this.diffMatrix = newMatrix.divide(startMatrix)

        this.transform()
      })
      .onDestroy(({ moved }) => {
        this.isMoving = false
        this.onEndTransform()
        if (moved) {
          this.undo.track('state', t('move nodes'))
        }
      })
      .start(e)
  }

  onResize(directions: TRBL[], options?: { e?: MouseEvent; shiftKey?: boolean }) {
    this.isResizing = true
    const { startMRect, startMatrix } = this.onStartTransform()
    this.resizeStartMRect = startMRect
    this.resizeDirections = [...directions]
    const endMatrix = Matrix.of(startMatrix)

    this.dragger
      .onMove(({ shift }) => {
        this.action = 'resize'
        shift = Matrix.of(startMRect.matrix).applyShift(shift, true)

        const { tx, ty, scaleX, scaleY } = iife(() => {
          const startWidth = startMRect.width
          const startHeight = startMRect.height
          let width = startWidth
          let height = startHeight
          let tx = startMatrix.tx
          let ty = startMatrix.ty
          const shiftX = shift.x
          const shiftY = shift.y
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

          const resizeX = directions.includes('left') || directions.includes('right')
          const resizeY = directions.includes('top') || directions.includes('bottom')
          const rawScaleX = width / startWidth
          const rawScaleY = height / startHeight
          let keepRatioScale = resizeX ? rawScaleX : rawScaleY
          if (resizeX && resizeY) {
            keepRatioScale =
              (width * startWidth + height * startHeight) /
              (startWidth ** 2 + startHeight ** 2)
          }

          const keepRatio =
            options?.shiftKey || (this.isSingleSelect && startMRect.aspectRatio > 0)
          if (keepRatio && startWidth > 0 && startHeight > 0) {
            width = startWidth * keepRatioScale
            height = startHeight * keepRatioScale
            tx = directions.includes('left')
              ? startMatrix.tx + startWidth - width
              : startMatrix.tx + (resizeX ? 0 : (startWidth - width) / 2)
            ty = directions.includes('top')
              ? startMatrix.ty + startHeight - height
              : startMatrix.ty + (resizeY ? 0 : (startHeight - height) / 2)
          }

          const scaleX = width / startWidth
          const scaleY = height / startHeight
          this.keepRatioScale = Math.sqrt(Math.abs(scaleX * scaleY))
          this.scaleX = scaleX
          this.scaleY = scaleY
          return { tx, ty, scaleX, scaleY }
        })

        endMatrix.set({ a: scaleX, d: scaleY, tx, ty })
        this.diffMatrix = Matrix.of(endMatrix).divide(startMatrix)
        this.mrect = MRect.of(startMRect).transform(
          this.diffMatrix,
          this.isSingleSelect,
        )

        this.transform()
      })
      .onDestroy(({ moved }) => {
        this.onEndTransform()
        if (moved) {
          this.undo.track('state', t('resize nodes'))
        }
      })
      .start(options?.e)
  }

  onRotate() {
    const { startMRect } = this.onStartTransform()
    const startRect = AABB.rect(startMRect.aabb)
    const startMatrix = Matrix.identity().shift(startRect)

    this.dragger
      .onMove(({ current, start }) => {
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
          this.undo.track('state', t('rotate nodes'))
        }
      })
      .start()
  }

  private mrectCache = new Map<ID, IMRect>()

  private onStartTransform() {
    this.nodeController.selectNodes.forEach((node) => {
      this.mrectCache.set(node.id, MRect.of(node))
    })
    const startMRect = this.mrect.clone()
    const startMatrix = this.isSingleSelect
      ? Matrix.identity()
      : Matrix.of(startMRect.matrix)
    return { startMRect, startMatrix }
  }

  private onEndTransform() {
    this.isResizing = false
    this.mrectCache.clear()
    this.diffMatrix = Matrix.identity()
    this.keepRatioScale = 1
    this.scaleX = 1
    this.scaleY = 1
    this.resizeStartMRect = MRect.identity()
    this.resizeDirections = []
  }

  private transform() {
    this.yState.transact(() => {
      this.nodeController.selectNodes.forEach(this.applyToNode)
    })
  }

  private applyToNode(node: S.Node) {
    const mrect = this.mrectCache.get(node.id)
    if (!this.diffMatrix || !mrect) return

    const startMRect = MRect.of(mrect)
    const forwardMatrix = SchemaHelper.getForwardAccumulatedMatrix(node)

    if (this.nodeController.selectNodes.length === 1 && this.action === 'resize') {
      startMRect.transform(this.diffMatrix, true)
    } else {
      const localDiff = Matrix.of(forwardMatrix)
        .invert()
        .append(this.diffMatrix)
        .append(forwardMatrix)
      if (this.action === 'resize' && startMRect.aspectRatio > 0) {
        const startSceneMRect = MRect.of(mrect)
        startSceneMRect.matrix = Matrix.of(mrect.matrix)
          .prepend(forwardMatrix)
          .plain()
        const startAABB = startSceneMRect.aabb
        const selectionAABB = this.mrect.aabb
        const nodeScale = Math.min(
          this.keepRatioScale,
          (selectionAABB.maxX - selectionAABB.minX) /
            (startAABB.maxX - startAABB.minX),
          (selectionAABB.maxY - selectionAABB.minY) /
            (startAABB.maxY - startAABB.minY),
        )
        const scaleXSign = Math.sign(this.scaleX)
        const scaleYSign = Math.sign(this.scaleY)
        // 等比缩放节点并保留选择框的翻转方向
        const keepRatioMatrixDiff = Matrix.identity().scale(
          scaleXSign * nodeScale,
          scaleYSign * nodeScale,
        )
        startMRect.transform(keepRatioMatrixDiff, true)
        const selectionStartAABB = this.resizeStartMRect.aabb
        const resizedSceneMRect = MRect.of(startMRect)
        resizedSceneMRect.matrix = Matrix.of(startMRect.matrix)
          .prepend(forwardMatrix)
          .plain()
        const resizedAABB = resizedSceneMRect.aabb
        const newX = calculateAxisPosition({
          startSelectionMin: selectionStartAABB.minX,
          startSelectionSize: selectionStartAABB.maxX - selectionStartAABB.minX,
          startNodeMin: startAABB.minX,
          startNodeSize: startAABB.maxX - startAABB.minX,
          endSelectionMin: selectionAABB.minX,
          endSelectionSize: selectionAABB.maxX - selectionAABB.minX,
          endNodeSize: resizedAABB.maxX - resizedAABB.minX,
          flipped: this.scaleX < 0,
          fallbackAnchor: this.resizeDirections.includes('left')
            ? 1
            : this.resizeDirections.includes('right')
              ? 0
              : 0.5,
        })
        const newY = calculateAxisPosition({
          startSelectionMin: selectionStartAABB.minY,
          startSelectionSize: selectionStartAABB.maxY - selectionStartAABB.minY,
          startNodeMin: startAABB.minY,
          startNodeSize: startAABB.maxY - startAABB.minY,
          endSelectionMin: selectionAABB.minY,
          endSelectionSize: selectionAABB.maxY - selectionAABB.minY,
          endNodeSize: resizedAABB.maxY - resizedAABB.minY,
          flipped: this.scaleY < 0,
          fallbackAnchor: this.resizeDirections.includes('top')
            ? 1
            : this.resizeDirections.includes('bottom')
              ? 0
              : 0.5,
        })
        const sceneShift = XY.$(newX - resizedAABB.minX, newY - resizedAABB.minY)
        startMRect.shift(Matrix.of(forwardMatrix).applyShift(sceneShift, true))
      } else {
        startMRect.transform(localDiff)
      }
    }

    this.yState.set<S.Node>([node.id, 'width'], startMRect.width)
    this.yState.set<S.Node>([node.id, 'height'], startMRect.height)
    this.yState.set<S.Node>([node.id, 'matrix'], startMRect.matrix)
  }
}
