import { autorun, makeObservable, observable, toJS } from 'mobx'
import {
  ClientUndoService,
  type ClientUndoMetadata,
  type ClientUndoSlice,
} from './client-undo'

const createInitialState = () => ({
  count: 0,
  title: 'Untitled',
})

const TEMP_KEY = 'temp'

export type TempState = ReturnType<typeof createInitialState>
type TempListener = (state: TempState) => void

export class TempTravelsStore {
  count = createInitialState().count
  title = createInitialState().title

  private clientUndo = new ClientUndoService()
  private temp: ClientUndoSlice<TempState>

  constructor() {
    makeObservable(this, {
      count: observable.ref,
      title: observable.ref,
    })
    this.temp = this.clientUndo.register(TEMP_KEY, this, ['count', 'title'])
  }

  get state() {
    return {
      count: this.count,
      title: this.title,
    }
  }

  setTitle = (title: string, metadata?: ClientUndoMetadata) => {
    this.temp.set((state) => {
      state.title = title
    }, metadata)
  }

  increase = (step = 1, metadata?: ClientUndoMetadata) => {
    this.temp.set((state) => {
      state.count += step
    }, metadata)
  }

  undo = () => {
    this.clientUndo.undo()
  }

  redo = () => {
    this.clientUndo.redo()
  }

  reset = () => {
    this.clientUndo.reset()
  }

  archive = () => {
    this.clientUndo.archive({ label: 'Temp' })
  }

  subscribe = (listener: TempListener) =>
    this.clientUndo.subscribe(() => listener(this.state))

  get canUndo() {
    return this.clientUndo.canUndo
  }

  get canRedo() {
    return this.clientUndo.canRedo
  }
}

export const TempTravels = new TempTravelsStore()

autorun(() => {
  console.log('TempTravels.state', toJS(TempTravels.state))
})

TempTravels.setTitle('test')
TempTravels.increase(1)
TempTravels.archive()

setTimeout(() => {
  TempTravels.undo()
}, 1000)

setTimeout(() => {
  TempTravels.redo()
}, 2000)
