import { MobxUndoSlice } from '@gitborlando/mobx-undo'
import { Signal } from '@gitborlando/signal'
import equal from 'fast-deep-equal'
import { makeObservable } from 'mobx'
import { Undo } from 'src/editor/core/undo'
import { Service } from 'src/global/service'

export type HandleSelectState = {
  selectIdMap: Selection
  selectPageId: ID | ''
}

export type Selection = Record<string, boolean>

@reflection
export class HandleSelect extends Service {
  @observable.ref selectIdMap: Selection = {}
  @observable selectPageId: ID | '' = ''
  afterSelect = Signal.create<void>()

  private selectUndo: MobxUndoSlice<HandleSelectState>

  constructor(private readonly undo: Undo) {
    super()
    autoBind(makeObservable(this))

    this.selectUndo = this.undo.mobxUndo.register('select', this, [
      'selectIdMap',
      'selectPageId',
    ])
  }

  @computed get selectIdList() {
    return Object.keys(this.selectIdMap)
  }

  select(id: ID) {
    if (this.selectIdMap[id]) return

    this.selectUndo.set((state) => {
      state.selectIdMap[id] = true
    })
  }

  unselect(id: ID) {
    if (!this.selectIdMap[id]) return

    this.selectUndo.set((state) => {
      delete state.selectIdMap[id]
    })
  }

  clearSelect() {
    if (this.selectIdList.length === 0) return

    this.selectUndo.set((state) => {
      state.selectIdMap = {}
    })
  }

  replaceSelection(selection: Selection) {
    if (equal(this.selectIdMap, selection)) return

    this.selectUndo.set((state) => {
      state.selectIdMap = { ...selection }
    })
  }

  appendSelection(selection: Selection) {
    this.replaceSelection({ ...this.selectIdMap, ...selection })
  }

  selectPage(id: ID) {
    if (this.selectPageId === id && this.selectIdList.length === 0) return

    this.selectUndo.set((state) => {
      state.selectPageId = id
      state.selectIdMap = {}
    })
  }
}
