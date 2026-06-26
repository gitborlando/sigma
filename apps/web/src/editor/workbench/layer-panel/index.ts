import { EditorService } from 'src/editor/service'

export class LayerPanelService extends EditorService {
  @observable pagePanelHeight = 200
  @observable pagePanelExpanded = true

  subscribe() {
    return autorun(() => {
      this.pagePanelHeight = this.pagePanelExpanded ? 200 : 32
    })
  }
}
