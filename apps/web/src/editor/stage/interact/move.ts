import { Disposer } from '@gitborlando/toolkit/disposer'
import { StageCursor, StageSurface, StageViewport } from 'src/editor'
import { Matrix } from 'src/editor/geometry'
import { Drag } from 'src/global/event/drag'

export class StageMoveService {
  @observable isMoving = false

  startInteract() {
    const disposer = Disposer.combine(
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
        const matrix = Matrix.of(StageViewport.sceneMatrix).shift(delta)
        StageViewport.sceneMatrix = matrix.clone()
      })
      .onDestroy(() => {
        this.isMoving = false
        StageCursor.unlock().setCursor('hand').lock()
      })
      .start()
  }
}
