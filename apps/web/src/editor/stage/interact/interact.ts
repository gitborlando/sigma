import { matchCase, NoopFunc } from '@gitborlando/utils'
import { EditorService } from '../..'

export type IStageInteraction = 'select' | 'move' | 'create'

export class StageInteractService extends EditorService {
  @observable interaction: IStageInteraction = 'select'
  private offInteract?: NoopFunc

  subscribe() {
    const dispose = this.onInteract()
    return () => {
      dispose()
      this.offInteract?.()
    }
  }

  private onInteract() {
    return autorun(() => {
      this.offInteract?.()

      const interact = matchCase(this.interaction, {
        select: () => this.editor.stageSelect.startInteract(),
        move: () => this.editor.stageMove.startInteract(),
        create: () => this.editor.stageCreate.startInteract(),
      })

      this.offInteract = interact?.()
    })
  }
}
