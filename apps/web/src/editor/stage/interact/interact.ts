import { matchCase, NoopFunc } from '@gitborlando/utils'
import { StageCreate, StageMove, StageSelect } from 'src/editor'

export type IStageInteraction = 'select' | 'move' | 'create'

export class StageInteractService {
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
        select: () => StageSelect.startInteract(),
        move: () => StageMove.startInteract(),
        create: () => StageCreate.startInteract(),
      })

      this.offInteract = interact?.()
    })
  }
}
