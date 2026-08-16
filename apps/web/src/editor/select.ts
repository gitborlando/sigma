import { MobxUndoSlice } from '@gitborlando/mobx-undo'
import { Signal } from '@gitborlando/signal'
import equal from 'fast-deep-equal'
import { makeObservable, untracked } from 'mobx'
import { Undo } from 'src/editor/action/undo'
import { findNode, findPage } from 'src/editor/doc/finder'
import { YDoc } from 'src/editor/y-adapter/y-doc'
import { Service } from '@gitborlando/di-service'

export type SelectState = { selection: Selection; selectPageId: ID | '' }

export type Selection = Record<string, boolean>

@reflection
export class Select extends Service {
  @observable.ref selection: Selection = {}
  @observable selectPageId: ID | '' = ''
  afterSelect = Signal.create<void>()

  private selectUndo: MobxUndoSlice<SelectState>

  constructor(
    private readonly undo: Undo,
    private readonly yDoc: YDoc,
  ) {
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

  get observedSelectedNodes() {
    return this.selectIds.map((id) => this.yDoc.observedDoc.graphs[id] as S.Node)
  }

  getSelectedNodes() {
    const selectIds = untracked(() => this.selectIds)
    return selectIds.map((id) => findNode(id))
  }

  getSelectedPage() {
    return findPage(untracked(() => this.selectPageId))
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
