import { makeObservable } from 'mobx'
import { Service } from 'src/global/service'

@reflection
export class LayerPageList extends Service {
  @observable panelHeight = 200
  @observable isCollapsed = false

  constructor() {
    super()
    autoBind(makeObservable(this))
    this.effect(
      autorun(() => {
        this.panelHeight = this.isCollapsed ? 32 : 200
      }),
    )
  }
}
