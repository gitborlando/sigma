import { matchCase, NoopFunc } from '@gitborlando/utils'
import { StageCreate } from './create'
import { StageMove } from './move'
import { StageSelect } from './select'

export type IStageInteraction = 'select' | 'move' | 'create'

class StageInteractService {
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

      this.offInteract = interact()
    })
  }
}

export const StageInteract = autoBind(makeObservable(new StageInteractService()))
