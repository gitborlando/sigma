import { Disposer } from '@gitborlando/toolkit/disposer'
import { Matrix } from 'src/editor/geometry'
import { StageSurfaceService } from 'src/editor/render/surface'
import { StageCursorService } from 'src/editor/stage/cursor'
import { StageViewportService } from 'src/editor/stage/viewport'
import { Drag } from 'src/global/event/drag'
import { Service } from 'src/global/service'

export class StageMoveService extends Service {
  @observable isMoving = false

  constructor(
    private readonly stageSurface: StageSurfaceService,
    private readonly stageCursor: StageCursorService,
    private readonly stageViewport: StageViewportService,
  ) {
    super()
    autoBind(makeObservable(this))
  }

  startInteract() {
    const disposer = Disposer.combine(
      this.stageSurface.addEvent('mousedown', this.onMoveStage),
      this.stageSurface.disablePointEvent(false),
    )
    this.stageCursor.setCursor('hand').lock()

    return () => {
      disposer()
      this.stageCursor.unlock().setCursor('select', 0)
    }
  }

  private onMoveStage() {
    Drag.onStart(() => this.stageCursor.unlock().setCursor('grab').lock())
      .onMove(({ delta }) => {
        this.isMoving = true
        const matrix = Matrix.of(this.stageViewport.sceneMatrix).shift(delta)
        this.stageViewport.sceneMatrix = matrix.clone()
      })
      .onDestroy(() => {
        this.isMoving = false
        this.stageCursor.unlock().setCursor('hand').lock()
      })
      .start()
  }
}
