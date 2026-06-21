import { action, toJS } from 'mobx'
import { createTravels, type TravelMetadata } from 'travels'

export type MobxUndoState = Record<string, unknown>
export type MobxUndoMetadata = TravelMetadata
export type MobxUndoUpdater<T> = (state: T) => void
type MobxUndoListener = (state: MobxUndoState) => void
export type MobxUndoSliceListener<T> = (state: T) => void
type MobxUndoTarget = Record<string, unknown>

export class MobxUndoSlice<T extends object> {
  state: T
  private listeners = new Set<MobxUndoSliceListener<T>>()

  constructor(
    private mobxUndo: MobxUndoService,
    private key: string,
    state: T,
  ) {
    this.state = state
  }

  set(updater: MobxUndoUpdater<T>, metadata?: MobxUndoMetadata) {
    this.mobxUndo.set(this.key, updater, metadata)
    return this
  }

  replace(state: T, metadata?: MobxUndoMetadata) {
    this.mobxUndo.replace(this.key, state, metadata)
    return this
  }

  subscribe(listener: MobxUndoSliceListener<T>) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  sync(state: T) {
    this.state = state
    this.listeners.forEach((listener) => listener(state))
  }
}

export class MobxUndoService {
  private travels = createTravels<MobxUndoState>(
    {},
    { autoArchive: false, maxHistory: 100 },
  )
  private slices = new Map<string, MobxUndoSlice<object>>()
  private syncedState = this.travels.getState()

  constructor() {
    this.travels.subscribe((state) => {
      if (state !== this.syncedState) {
        this.syncedState = state
        this.syncSlices(state)
      }
    })
  }

  get state() {
    return this.travels.getState()
  }

  register<TTarget extends object, TField extends keyof TTarget & string>(
    key: string,
    target: TTarget,
    fields: TField[],
  ) {
    const slice = this.slices.get(key)
    if (slice) {
      const existSlice = slice as MobxUndoSlice<Pick<TTarget, TField>>
      this.syncTargetWithSlice(existSlice, target, fields)
      return existSlice
    }

    this.assertCanRegister()
    const initialState = this.getTargetState(target, fields)
    const state = this.clone(initialState)
    this.travels.replaceStateWithoutHistory((state) => {
      state[key] = this.clone(initialState)
    })

    const newSlice = new MobxUndoSlice(this, key, state)
    this.syncTargetWithSlice(newSlice, target, fields)
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

  set<T extends object>(
    key: string,
    updater: MobxUndoUpdater<T>,
    metadata?: MobxUndoMetadata,
  ) {
    this.assertRegistered(key)
    this.travels.setState((state) => {
      updater(state[key] as T)
    }, metadata)
  }

  replace<T extends object>(key: string, value: T, metadata?: MobxUndoMetadata) {
    this.assertRegistered(key)
    this.travels.setState((state) => {
      state[key] = value
    }, metadata)
  }

  applyState(state: MobxUndoState | undefined, metadata?: MobxUndoMetadata) {
    if (!state) return

    this.assertRegisteredState(state)
    this.travels.setState(() => state, metadata)
  }

  applyStateWithoutHistory(state: MobxUndoState | undefined) {
    if (!state) return

    this.assertRegisteredState(state)
    this.travels.replaceStateWithoutHistory(() => state)
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

  reset() {
    this.travels.reset()
  }

  rebase() {
    this.travels.rebase()
  }

  getPatches() {
    return this.travels.getPatches()
  }

  getHistory() {
    return this.travels.getHistory()
  }

  getMetadata() {
    return this.travels.getMetadata()
  }

  batch(metadata: MobxUndoMetadata, callback: () => void) {
    this.travels.transaction(metadata, callback)
  }

  subscribe(listener: MobxUndoListener) {
    return this.travels.subscribe((state) => listener(state))
  }

  get canUndo() {
    return this.travels.canBack() || this.travels.canArchive()
  }

  get canRedo() {
    return this.travels.canForward()
  }

  get canArchive() {
    return this.travels.canArchive()
  }

  private syncSlices(state: MobxUndoState) {
    this.slices.forEach((slice, key) => {
      const nextState = state[key] as object | undefined
      if (!nextState) return

      slice.sync(nextState)
    })
  }

  private syncTargetWithSlice<
    TTarget extends object,
    TField extends keyof TTarget & string,
  >(slice: MobxUndoSlice<Pick<TTarget, TField>>, target: TTarget, fields: TField[]) {
    slice.subscribe(
      action((state) => {
        fields.forEach((field) => (target[field] = state[field]))
      }),
    )
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
