import { Service } from '@gitborlando/di-service'
import { Dragger } from '@gitborlando/toolkit/browser'
import { iife } from '@gitborlando/utils'
import hotkeys from 'hotkeys-js'
import { makeObservable } from 'mobx'
import { NodeAction } from 'src/editor/action/node'
import { Undo } from 'src/editor/action/undo'
import { DocHelper } from 'src/editor/doc/helper'
import { DocMutator } from 'src/editor/doc/mutator'
import { HitTest, IMRect, Matrix, MRect } from 'src/editor/geometry'
import { ElemMouseEvent } from 'src/editor/render/elem/event'
import { Select } from 'src/editor/select'
import { Setting } from 'src/editor/setting'
import { StageCursor } from 'src/editor/stage/cursor'
import { createStageDragger } from 'src/editor/stage/dragger'
import { StageViewport } from 'src/editor/stage/viewport'
import { snapGridRound, snapGridRoundXY, TRBL } from 'src/editor/utils'
import { YDoc } from 'src/editor/y-adapter/y-doc'
import { GRAPHS } from 'src/shared/constant'

type TransformerAction = 'move' | 'resize' | 'rotate' | 'flip'

interface ResizeResult {
  mrect: MRect
  points?: S.Point[]
}

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
    return this.select.observedSelectedNodes.length === 1
  }
  @computed get isSelectOneLine() {
    if (this.select.observedSelectedNodes.length !== 1) return false
    return DocHelper.isNode(this.select.observedSelectedNodes[0], 'line')
  }

  private action: TransformerAction = 'move'
  private isResizing = false
  private keepRatioScale = 1 // 锁定比例节点的统一缩放倍率
  private scaleX = 1 // 选择框横向缩放倍率，用于保留翻转方向
  private scaleY = 1 // 选择框纵向缩放倍率，用于保留翻转方向
  private resizeStartMRect = MRect.identity()
  private resizeDirections: TRBL[] = []

  private dragger!: Dragger

  constructor(
    private readonly yDoc: YDoc,
    private readonly undo: Undo,
    private readonly stageViewport: StageViewport,
    private readonly setting: Setting,
    private readonly select: Select,
    private readonly docMutator: DocMutator,
    private readonly nodeAction: NodeAction,
    private readonly stageCursor: StageCursor,
  ) {
    super()
    autoBind(makeObservable(this))
    this.dragger = createStageDragger(this.stageViewport)
  }

  setup(selectNodes: S.Node[]) {
    if (this.isResizing) return this.mrect

    if (selectNodes.length === 1) {
      const node = selectNodes[0]
      const matrix = DocHelper.getRootMatrix(node)
      return (this.mrect = MRect.of({ ...node, matrix }))
    }

    const aabbList = selectNodes.map((node) => {
      const matrix = DocHelper.getRootMatrix(node)
      return MRect.fromRect(node, matrix).aabb
    })
    const rect = AABB.rect(AABB.merge(aabbList))
    this.mrect = MRect.fromRect(rect, Matrix.identity().shift(rect))
    return this.mrect
  }

  /**
   * @param xy sceneXY
   */
  isPointIn(xy: IXY) {
    const { width, height, matrix } = this.mrect
    xy = Matrix.of(matrix).invert().applyXY(xy)
    return HitTest.hitRoundRect(width, height, 0)(xy)
  }

  flip(axis: 'x' | 'y') {
    if (this.select.selectIds.length < 2) return

    const { startMRect } = this.onStartTransform()
    const { center } = startMRect
    this.action = 'flip'
    this.diffMatrix = Matrix.identity().set(
      axis === 'x' ? { a: -1, tx: center.x * 2 } : { d: -1, ty: center.y * 2 },
    )

    this.transform()
    this.onEndTransform()
  }

  onMove(e: ElemMouseEvent) {
    const { startMRect, startMatrix } = this.onStartTransform()
    const startAABB = startMRect.aabb
    let hasMovedNodesInOrOutFrame = false
    let previousMatrix = startMatrix

    this.dragger
      .onStart(() => {
        if (!hotkeys.alt) return

        this.stageCursor.setCursor('copy')
        this.nodeAction.altCopy()
      })
      .onMove(({ shift }) => {
        this.action = 'move'
        this.isMoving = true

        const aabb = AABB.shift(AABB.clone(startAABB), shift)
        const snapDelta = XY.$(
          snapGridRound(aabb.minX, this.setting.snapToGrid) - aabb.minX,
          snapGridRound(aabb.minY, this.setting.snapToGrid) - aabb.minY,
        )

        const newMatrix = Matrix.of(startMatrix).shift(shift).shift(snapDelta)
        this.diffMatrix = Matrix.of(newMatrix).divide(previousMatrix)
        previousMatrix = newMatrix

        this.transform()

        hasMovedNodesInOrOutFrame = this.nodeAction.moveNodesInOrOutFrame(
          XY.of(e.globalXY).plus(shift),
        )
        this.select.getSelectedNodes().forEach((node) => {
          this.mrectCache.set(node.id, MRect.of(node))
        })
      })
      .onDestroy(({ moved }) => {
        this.isMoving = false
        this.onEndTransform()
        if (moved) {
          const desc = hasMovedNodesInOrOutFrame
            ? 'moved nodes in or out frame'
            : 'moved nodes'
          this.undo.track('state', t(desc))
        }
      })
      .start(e.hostEvent)
  }

  onResize(directions: TRBL[], options?: { e?: MouseEvent; shiftKey?: boolean }) {
    this.isResizing = true
    const { startMRect, startMatrix } = this.onStartTransform()
    const node = this.select.getSelectedNodes()[0]

    if (this.isSelectOneLine) {
      this.resizeLine(node as S.Line, startMRect, directions, options?.e)
      return
    }

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

  private resizeLine(
    node: S.Line,
    startMRect: MRect,
    directions: TRBL[],
    e?: MouseEvent,
  ) {
    const [start, end] = startMRect.vertices
    const isMoveStartHandler = directions.includes('left')
    const fixedPoint = isMoveStartHandler ? end : start
    const movingPoint = isMoveStartHandler ? start : end
    const forwardMatrix = DocHelper.getAncestorMatrix(node)
    const [startPoint, endPoint] = node.points

    this.dragger
      .onMove(({ shift }) => {
        this.action = 'resize'

        const movedPoint = snapGridRoundXY(
          XY.of(movingPoint).plus(shift),
          this.setting.snapToGrid,
        )
        const lineStart = isMoveStartHandler ? movedPoint : fixedPoint
        const lineEnd = isMoveStartHandler ? fixedPoint : movedPoint
        const width = XY.distance(lineStart, lineEnd)
        const rotation = Angle.sweep(XY.vector(lineEnd, lineStart))
        const sceneMatrix = Matrix.identity().rotate(rotation).shift(lineStart)
        const matrix = forwardMatrix.invert().append(sceneMatrix).plain()
        const result: ResizeResult = {
          mrect: new MRect(width, 0, matrix),
          points: [
            { ...startPoint, x: 0, y: 0 },
            { ...endPoint, x: width, y: 0 },
          ],
        }

        this.mrect = new MRect(width, 0, sceneMatrix.plain())
        this.yDoc.transact(() =>
          this.applyNodeMRect(node, result.mrect, result.points),
        )
      })
      .onDestroy(({ moved }) => {
        this.onEndTransform()
        if (moved) this.undo.track('state', t('resize nodes'))
      })
      .start(e)
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
    this.select.getSelectedNodes().forEach((node) => {
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
    this.yDoc.transact(() => {
      this.select.getSelectedNodes().forEach(this.applyToNode)
    })
  }

  private applyToNode(node: S.Node) {
    const mrect = this.mrectCache.get(node.id)
    if (!this.diffMatrix || !mrect) return

    const startMRect = MRect.of(mrect)
    const ancestorsMatrix = DocHelper.getAncestorMatrix(node)

    if (this.select.selectIds.length === 1 && this.action === 'resize') {
      startMRect.transform(this.diffMatrix, true)
    } else {
      const localDiff = ancestorsMatrix
        .invert()
        .append(this.diffMatrix)
        .append(ancestorsMatrix)
      if (this.action === 'flip') {
        startMRect.matrix = Matrix.of(startMRect.matrix).prepend(localDiff).plain()
      } else if (this.action === 'resize' && startMRect.aspectRatio > 0) {
        const startSceneMRect = MRect.of(mrect)
        startSceneMRect.matrix = Matrix.of(mrect.matrix)
          .prepend(ancestorsMatrix)
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
          .prepend(ancestorsMatrix)
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
        startMRect.shift(Matrix.of(ancestorsMatrix).applyShift(sceneShift, true))
      } else {
        startMRect.transform(localDiff)
      }
    }

    this.applyNodeMRect(node, startMRect)
  }

  private applyNodeMRect(node: S.Node, mrect: MRect, points?: S.Point[]) {
    if (points) {
      this.yDoc.set<S.Line>([GRAPHS, node.id, 'points'], points)
      this.yDoc.set<S.Node>([GRAPHS, node.id, 'width'], mrect.width)
      this.yDoc.set<S.Node>([GRAPHS, node.id, 'height'], mrect.height)
    } else {
      this.docMutator.setNodeSize(node, mrect.width, mrect.height)
    }
    this.yDoc.set<S.Node>([GRAPHS, node.id, 'matrix'], mrect.matrix)
  }
}
