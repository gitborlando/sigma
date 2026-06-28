import { Signal } from '@gitborlando/signal'
import { makeObservable } from 'mobx'
import { MobxUndo } from 'src/editor/core/undo'
import { Service } from 'src/global/service'

export type HandleSelectState = {
  selectIdMap: Record<string, boolean>
  selectPageId: ID | ''
}

export class HandleSelectService extends Service {
  @observable.ref selectIdMap: Record<string, boolean> = {}
  @observable selectPageId: ID | '' = ''
  afterSelect = Signal.create<void>()

  private selectUndo = MobxUndo.register<
    HandleSelectService,
    keyof HandleSelectState
  >('select', this, ['selectIdMap', 'selectPageId'])

  constructor() {
    super()
    makeObservable(this)
    autoBind(this)
  }

  subscribe() {
    return this.selectUndo.subscribe(() => {
      this.afterSelect.dispatch()
    })
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

  selectPage(id: ID) {
    if (this.selectPageId === id && this.selectIdList.length === 0) return

    this.selectUndo.set((state) => {
      state.selectPageId = id
      state.selectIdMap = {}
    })
  }
}
