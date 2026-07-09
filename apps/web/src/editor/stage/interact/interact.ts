import { matchCase, NoopFunc } from '@gitborlando/utils'
import { Service } from 'src/global/service'
import { StageCreate } from './create'
import { StageMove } from './move'
import { StageSelect } from './select'

export type IStageInteraction = 'select' | 'move' | 'create'

@reflection
export class StageInteract extends Service {
  @observable interaction: IStageInteraction = 'select'
  private offInteract?: NoopFunc

  constructor(
    private readonly stageSelect: StageSelect,
    private readonly stageMove: StageMove,
    private readonly stageCreate: StageCreate,
  ) {
    super()
    autoBind(makeObservable(this))
    this.effect(this.onFinishCreate())
  }

  onInteract() {
    const dispose = autorun(() => {
      this.offInteract?.()
      this.offInteract = matchCase(this.interaction, {
        select: () => this.stageSelect.startInteract(),
        move: () => this.stageMove.startInteract(),
        create: () => this.stageCreate.startInteract(),
      })?.()
    })
    this.effect(dispose, () => this.offInteract?.())
  }

  private onFinishCreate() {
    return this.stageCreate.finishCreate$.hook(() => {
      this.interaction = 'select'
    })
  }
}
