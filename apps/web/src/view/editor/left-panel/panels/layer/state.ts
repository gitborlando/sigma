class EditorLPLayerStateService {
  @observable pagePanelHeight = 200
  @observable allPageExpanded = true

  constructor() {
    makeObservable(this)
    autorun(() => {
      this.pagePanelHeight = this.allPageExpanded ? 200 : 32
    })
  }
}

export const EditorLPLayerState = autoBind(new EditorLPLayerStateService())
