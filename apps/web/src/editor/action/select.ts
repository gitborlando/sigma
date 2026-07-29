import hotkeys from 'hotkeys-js'
import { Undo } from 'src/editor/action/undo'
import { Select, type Selection } from 'src/editor/select'
import { Service } from 'src/global/service'

@reflection
export class SelectAction extends Service {
  constructor(
    private readonly select: Select,
    private readonly undo: Undo,
  ) {
    super()
    autoBind(this)
  }

  clearSelect() {
    if (hotkeys.shift) return
    this.select.clearSelect()
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
    this.select.replaceSelection(selection)
  }

  private singleSelect(id: ID, trackMsg?: string) {
    if (this.select.selection[id]) return

    if (hotkeys.shift) this.select.appendSelection({ [id]: true })
    else this.select.replaceSelection({ [id]: true })

    if (trackMsg) this.undo.track('client', trackMsg)
  }
}
