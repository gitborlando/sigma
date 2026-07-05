import { iife } from '@gitborlando/utils'
import { reflection } from 'first-di'
import { makeObservable } from 'mobx'
import { SettingService } from 'src/editor/core/setting'
import { UndoService } from 'src/editor/core/undo'
import { IMRect, Matrix, MRect } from 'src/editor/geometry'
import { HandleSelectService } from 'src/editor/handle/select'
import { SchemaHelper } from 'src/editor/schema/helper'
import { createStageDragger } from 'src/editor/stage/dragger'
import { StageViewportService } from 'src/editor/stage/viewport'
import { snapGridRoundBySetting, TRBL } from 'src/editor/utils/misc'
import { YStateService } from 'src/editor/y-adapter/y-state'
import { Service } from 'src/global/service'

type TransformerAction = 'move' | 'resize' | 'rotate'

@reflection
export class StageTransformerService extends Service {
  @observable.ref mrect = MRect.identity()
  @observable.ref diffMatrix = Matrix.identity()
  @observable isMoving = false

  @computed get isSingleSelect() {
    return this.handleSelect.selectIdList.length === 1
  }

  private action: TransformerAction = 'move'
  isSelectOnlyLine = false

  constructor(
    private readonly handleSelect: HandleSelectService,
    private readonly yState: YStateService,
    private readonly undo: UndoService,
    private readonly stageViewport: StageViewportService,
    private readonly setting: SettingService,
  ) {
    super()
    autoBind(makeObservable(this))
  }

  setup(selectNodes: S.Node[]) {
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

    createStageDragger(this.stageViewport)
      .onMove(({ shift }) => {
        this.action = 'move'
        this.isMoving = true

        const aabb = AABB.shift(startAABB, shift)
        const snapDelta = XY.$(
          snapGridRoundBySetting(this.setting.snapToGrid, aabb.minX) - aabb.minX,
          snapGridRoundBySetting(this.setting.snapToGrid, aabb.minY) - aabb.minY,
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

  onResize(
    directions: TRBL[],
    options?: {
      e?: MouseEvent
      shiftKey?: boolean
    },
  ) {
    const { startMRect, startMatrix } = this.onStartTransform()
    const endMatrix = Matrix.of(startMatrix)

    createStageDragger(this.stageViewport)
      .onMove(({ shift }) => {
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

        endMatrix.set({ a: scaleX, d: scaleY, tx, ty })
        this.diffMatrix = Matrix.of(endMatrix).divide(startMatrix)

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

    createStageDragger(this.stageViewport)
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
    this.handleSelect.selectIdList
      .map((id) => this.yState.find<S.Node>(id))
      .forEach((node) => {
        this.mrectCache.set(node.id, MRect.of(node))
      })
    const startMRect = this.mrect.clone()
    const startMatrix = this.isSingleSelect
      ? Matrix.identity()
      : Matrix.of(startMRect.matrix)
    return { startMRect, startMatrix }
  }

  private onEndTransform() {
    this.mrectCache.clear()
    this.diffMatrix = Matrix.identity()
  }

  private transform() {
    this.yState.transact(() => {
      this.handleSelect.selectIdList
        .map((id) => this.yState.find<S.Node>(id))
        .forEach(this.applyToNode)
    })
  }

  private applyToNode(node: S.Node) {
    const mrect = this.mrectCache.get(node.id)
    if (!this.diffMatrix || !mrect) return

    const startMRect = MRect.of(mrect)
    const forwardMatrix = SchemaHelper.getForwardAccumulatedMatrix(node)

    if (this.handleSelect.selectIdList.length === 1 && this.action === 'resize') {
      startMRect.transform(this.diffMatrix, true)
    } else {
      const localDiff = Matrix.of(forwardMatrix)
        .invert()
        .append(this.diffMatrix)
        .append(forwardMatrix)
      startMRect.transform(localDiff)
    }

    this.yState.set<S.Node>([node.id, 'width'], startMRect.width)
    this.yState.set<S.Node>([node.id, 'height'], startMRect.height)
    this.yState.set<S.Node>([node.id, 'matrix'], startMRect.matrix)
  }
}
