import { makeObservable } from 'mobx'
import { Service } from 'src/global/service'

export class LayerPanelService extends Service {
  @observable pagePanelHeight = 200
  @observable pagePanelExpanded = true

  constructor() {
    super()
    autoBind(makeObservable(this))
    this.effect(
      autorun(() => {
        this.pagePanelHeight = this.pagePanelExpanded ? 200 : 32
      }),
    )
  }
}
