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
    this.effect(autorun(this.onInteract))
  }

  private onInteract() {
    this.offInteract?.()

    const interact = matchCase(this.interaction, {
      select: () => this.stageSelect.startInteract(),
      move: () => this.stageMove.startInteract(),
      create: () => this.stageCreate.startInteract(),
    })

    this.offInteract = interact?.()
  }
}
