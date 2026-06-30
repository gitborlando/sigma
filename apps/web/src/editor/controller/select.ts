import hotkeys from 'hotkeys-js'
import { UndoService } from 'src/editor/core/undo'
import { HandleSelectService, type Selection } from 'src/editor/handle/select'
import { Service } from 'src/global/service'

export class SelectControllerService extends Service {
  constructor(
    private readonly handleSelect: HandleSelectService,
    private readonly undo: UndoService,
  ) {
    super()
    autoBind(this)
  }

  clearSelect() {
    if (hotkeys.shift) return
    this.handleSelect.clearSelect()
  }

  onStageSelect(id: ID) {
    this.singleSelect(id, t('select nodes by clicking'))
  }

  onPanelSelect(id: string) {
    this.singleSelect(id, t('select nodes from panel'))
  }

  onCreateSelect(id: string) {
    this.singleSelect(id)
  }

  replaceSelection(selection: Selection) {
    this.handleSelect.replaceSelection(selection)
  }

  private singleSelect(id: ID, trackMsg?: string) {
    if (this.handleSelect.selectIdMap[id]) return

    if (hotkeys.shift) this.handleSelect.appendSelection({ [id]: true })
    else this.handleSelect.replaceSelection({ [id]: true })

    if (trackMsg) this.undo.track('client', trackMsg)
  }
}
