import { StageSurface } from 'src/editor/render/surface'
import { StageCursor } from 'src/editor/stage/cursor'
import { Drag } from 'src/global/event/drag'
import { StageViewport } from '../viewport'

class StageMoveService {
  @observable isMoving = false

  startInteract() {
    const disposer = Disposer.collect(
      StageSurface.addEvent('mousedown', this.onMoveStage),
      StageSurface.disablePointEvent(false),
    )
    StageCursor.setCursor('hand').lock()

    return () => {
      disposer()
      StageCursor.unlock().setCursor('select', 0)
    }
  }

  private onMoveStage() {
    Drag.onStart(() => StageCursor.unlock().setCursor('grab').lock())
      .onMove(({ delta }) => {
        this.isMoving = true
        const matrix = Matrix(StageViewport.sceneMatrix).shift(delta)
        StageViewport.sceneMatrix = matrix.clone()
      })
      .onDestroy(() => {
        this.isMoving = false
        StageCursor.unlock().setCursor('hand').lock()
      })
  }
}

export const StageMove = autoBind(makeObservable(new StageMoveService()))
