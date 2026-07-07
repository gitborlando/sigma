import { Disposer } from '@gitborlando/toolkit/disposer'
import { reflection } from 'first-di'
import { Matrix } from 'src/editor/geometry'
import { RenderSurface } from 'src/editor/render/surface'
import { StageCursor } from 'src/editor/stage/cursor'
import { StageEvent } from 'src/editor/stage/event'
import { StageViewport } from 'src/editor/stage/viewport'
import { Drag } from 'src/global/event/drag'
import { Service } from 'src/global/service'

@reflection
export class StageMove extends Service {
  @observable isMoving = false

  constructor(
    private readonly renderSurface: RenderSurface,
    private readonly stageEvent: StageEvent,
    private readonly stageCursor: StageCursor,
    private readonly stageViewport: StageViewport,
  ) {
    super()
    autoBind(makeObservable(this))
  }

  startInteract() {
    const disposer = Disposer.combine(
      this.renderSurface.addEvent('mousedown', this.onMoveStage),
      this.stageEvent.disablePointEvent(false),
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
