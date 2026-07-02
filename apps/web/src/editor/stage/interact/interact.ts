import { matchCase, NoopFunc } from '@gitborlando/utils'
import { Service } from 'src/global/service'
import { StageCreateService } from './create'
import { StageMoveService } from './move'
import { StageSelectService } from './select'

export type IStageInteraction = 'select' | 'move' | 'create'

export class StageInteractService extends Service {
  @observable interaction: IStageInteraction = 'select'
  private offInteract?: NoopFunc

  constructor(
    private readonly stageSelect: StageSelectService,
    private readonly stageMove: StageMoveService,
    private readonly stageCreate: StageCreateService,
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
