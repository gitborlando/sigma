import { MobxUndoSlice } from '@gitborlando/mobx-undo'
import { Signal } from '@gitborlando/signal'
import equal from 'fast-deep-equal'
import { makeObservable } from 'mobx'
import { Undo } from 'src/editor/core/undo'
import { Service } from 'src/global/service'

export type HandleSelectState = { selection: Selection; selectPageId: ID | '' }

export type Selection = Record<string, boolean>

@reflection
export class HandleSelect extends Service {
  @observable.ref selection: Selection = {}
  @observable selectPageId: ID | '' = ''
  afterSelect = Signal.create<void>()

  private selectUndo: MobxUndoSlice<HandleSelectState>

  constructor(private readonly undo: Undo) {
    super()
    autoBind(makeObservable(this))

    this.selectUndo = this.undo.mobxUndo.register('select', this, [
      'selection',
      'selectPageId',
    ])
  }

  @computed get selectIds() {
    return Object.keys(this.selection)
  }

  select(id: ID) {
    if (this.selection[id]) return

    this.selectUndo.set((state) => {
      state.selection[id] = true
    })
  }

  unselect(id: ID) {
    if (!this.selection[id]) return

    this.selectUndo.set((state) => {
      delete state.selection[id]
    })
  }

  clearSelect() {
    if (this.selectIds.length === 0) return

    this.selectUndo.set((state) => {
      state.selection = {}
    })
  }

  replaceSelection(selection: Selection) {
    if (equal(this.selection, selection)) return

    this.selectUndo.set((state) => {
      state.selection = { ...selection }
    })
  }

  appendSelection(selection: Selection) {
    this.replaceSelection({ ...this.selection, ...selection })
  }

  selectPage(id: ID) {
    if (this.selectPageId === id && this.selectIds.length === 0) return

    this.selectUndo.set((state) => {
      state.selectPageId = id
      state.selection = {}
    })
  }
}
