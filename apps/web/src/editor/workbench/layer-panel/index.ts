import { makeObservable } from 'mobx'
import { Service } from 'src/global/service'

export class LayerPanelService extends Service {
  @observable pagePanelHeight = 200
  @observable pagePanelExpanded = true

  constructor() {
    super()
    makeObservable(this)
    autoBind(this)
  }

  subscribe() {
    return autorun(() => {
      this.pagePanelHeight = this.pagePanelExpanded ? 200 : 32
    })
  }
}
