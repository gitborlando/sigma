import { runInAction, toJS } from 'mobx'
import { createTravels, type TravelMetadata } from 'travels'

export type MobxUndoState = Record<string, unknown>
export type MobxUndoMetadata = TravelMetadata
export type MobxUndoUpdater<T> = (state: T) => void
type MobxUndoSliceSetter<T> = (
  updater: MobxUndoUpdater<T>,
  metadata?: MobxUndoMetadata,
) => void
type MobxUndoDisposer = () => void
type MobxUndoTarget = Record<string, unknown>

export class MobxUndoSlice<T extends object> {
  state: T

  constructor(
    private setState: MobxUndoSliceSetter<T>,
    private target: MobxUndoTarget,
    private fields: string[],
    state: T,
  ) {
    this.state = state
  }

  set(updater: MobxUndoUpdater<T>, metadata?: MobxUndoMetadata) {
    this.setState(updater, metadata)
    return this
  }

  sync(state: T) {
    this.state = state
    runInAction(() => {
      const nextState = state as MobxUndoTarget
      this.fields.forEach((field) => (this.target[field] = nextState[field]))
    })
  }
}

export class MobxUndoService {
  private travels = createTravels<MobxUndoState>(
    {},
    { autoArchive: false, maxHistory: 100 },
  )
  private slices = new Map<string, MobxUndoSlice<object>>()
  private syncedState = this.travels.getState()
  private unsubscribe?: MobxUndoDisposer

  constructor() {
    this.unsubscribe = this.travels.subscribe((state) => {
      if (state !== this.syncedState) {
        this.syncedState = state
        this.syncSlices(state)
      }
    })
  }

  get state() {
    return this.travels.getState()
  }

  private get canUndo() {
    return this.travels.canBack() || this.travels.canArchive()
  }

  private get canRedo() {
    return this.travels.canForward()
  }

  private get canArchive() {
    return this.travels.canArchive()
  }

  register<TTarget extends object, TField extends keyof TTarget & string>(
    key: string,
    target: TTarget,
    fields: TField[],
  ) {
    const slice = this.slices.get(key)
    if (slice) {
      return slice as MobxUndoSlice<Pick<TTarget, TField>>
    }

    this.assertCanRegister()
    const initialState = this.clone(this.getTargetState(target, fields))
    this.travels.replaceStateWithoutHistory((state) => {
      state[key] = initialState
    })

    const newSlice = new MobxUndoSlice(
      (updater, metadata) => this.set(key, updater, metadata),
      target as MobxUndoTarget,
      fields,
      initialState,
    )
    this.slices.set(key, newSlice as MobxUndoSlice<object>)
    return newSlice
  }

  has(key: string) {
    return this.slices.has(key)
  }

  get<T extends object>(key: string) {
    this.assertRegistered(key)
    return this.state[key] as T
  }

  private set<T extends object>(
    key: string,
    updater: MobxUndoUpdater<T>,
    metadata?: MobxUndoMetadata,
  ) {
    this.assertRegistered(key)
    this.travels.setState((state) => {
      updater(state[key] as T)
    }, metadata)
  }

  applyState(state: MobxUndoState | undefined, metadata?: MobxUndoMetadata) {
    if (!state) return

    this.assertRegisteredState(state)
    this.travels.setState(() => state, metadata)
  }

  archive(metadata?: MobxUndoMetadata) {
    if (!this.travels.canArchive()) return false

    this.travels.archive(metadata)
    return true
  }

  undo() {
    this.travels.back()
  }

  redo() {
    this.travels.forward()
  }

  rebase() {
    this.travels.rebase()
  }

  dispose() {
    this.unsubscribe?.()
  }

  private syncSlices(state: MobxUndoState) {
    this.slices.forEach((slice, key) => {
      const nextState = state[key] as object | undefined
      if (!nextState) return

      slice.sync(nextState)
    })
  }

  private getTargetState<
    TTarget extends object,
    TField extends keyof TTarget & string,
  >(target: TTarget, fields: TField[]) {
    const targetRecord = target as MobxUndoTarget
    return Object.fromEntries(
      fields.map((field) => [field, this.clone(targetRecord[field])]),
    ) as Pick<TTarget, TField>
  }

  private clone<T>(state: T) {
    return structuredClone(toJS(state))
  }

  private assertRegistered(key: string) {
    if (this.slices.has(key)) return
    throw new Error(`MobxUndo: "${key}" is not registered.`)
  }

  private assertRegisteredState(state: MobxUndoState) {
    Object.keys(state).forEach((key) => this.assertRegistered(key))
  }

  private assertCanRegister() {
    if (!this.canUndo && !this.canRedo && !this.canArchive) return
    throw new Error('MobxUndo: register slices before editing undo state.')
  }
}
