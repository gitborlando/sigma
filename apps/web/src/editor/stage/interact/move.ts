import { Disposer } from '@gitborlando/toolkit/disposer'
import { Matrix } from 'src/editor/geometry'
import { Drag } from 'src/global/event/drag'
import { EditorService } from '../..'

export class StageMoveService extends EditorService {
  @observable isMoving = false

  startInteract() {
    const disposer = Disposer.combine(
      this.editor.stageSurface.addEvent('mousedown', this.onMoveStage),
      this.editor.stageSurface.disablePointEvent(false),
    )
    this.editor.stageCursor.setCursor('hand').lock()

    return () => {
      disposer()
      this.editor.stageCursor.unlock().setCursor('select', 0)
    }
  }

  private onMoveStage() {
    Drag.onStart(() => this.editor.stageCursor.unlock().setCursor('grab').lock())
      .onMove(({ delta }) => {
        this.isMoving = true
        const matrix = Matrix.of(this.editor.stageViewport.sceneMatrix).shift(delta)
        this.editor.stageViewport.sceneMatrix = matrix.clone()
      })
      .onDestroy(() => {
        this.isMoving = false
        this.editor.stageCursor.unlock().setCursor('hand').lock()
      })
      .start()
  }
}
