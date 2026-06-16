import autoBind from 'auto-bind'
import { action, toJS } from 'mobx'
import { createTravels, type TravelMetadata } from 'travels'

export type ClientUndoState = Record<string, unknown>
export type ClientUndoMetadata = TravelMetadata
export type ClientUndoUpdater<T> = (state: T) => void
type ClientUndoListener = (state: ClientUndoState) => void
export type ClientUndoSliceListener<T> = (state: T) => void
type ClientUndoTarget = Record<string, unknown>

export class ClientUndoSlice<T extends object> {
  state: T
  private listeners = new Set<ClientUndoSliceListener<T>>()

  constructor(
    private clientUndo: ClientUndoService,
    private key: string,
    state: T,
  ) {
    this.state = state
  }

  set(updater: ClientUndoUpdater<T>, metadata?: ClientUndoMetadata) {
    this.clientUndo.set(this.key, updater, metadata)
    return this
  }

  replace(state: T, metadata?: ClientUndoMetadata) {
    this.clientUndo.replace(this.key, state, metadata)
    return this
  }

  subscribe(listener: ClientUndoSliceListener<T>) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  sync(state: T) {
    this.state = state
    this.listeners.forEach((listener) => listener(state))
  }
}

export class ClientUndoService {
  private travels = createTravels<ClientUndoState>(
    {},
    { autoArchive: false, maxHistory: 100 },
  )
  private slices = new Map<string, ClientUndoSlice<object>>()
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
      const existSlice = slice as ClientUndoSlice<Pick<TTarget, TField>>
      this.syncTargetWithSlice(existSlice, target, fields)
      return existSlice
    }

    this.assertCanRegister()
    const initialState = this.getTargetState(target, fields)
    const state = this.clone(initialState)
    this.travels.replaceStateWithoutHistory((state) => {
      state[key] = this.clone(initialState)
    })

    const newSlice = new ClientUndoSlice(this, key, state)
    this.syncTargetWithSlice(newSlice, target, fields)
    this.slices.set(key, newSlice as ClientUndoSlice<object>)
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
    updater: ClientUndoUpdater<T>,
    metadata?: ClientUndoMetadata,
  ) {
    this.assertRegistered(key)
    this.travels.setState((state) => {
      updater(state[key] as T)
    }, metadata)
  }

  replace<T extends object>(key: string, value: T, metadata?: ClientUndoMetadata) {
    this.assertRegistered(key)
    this.travels.setState((state) => {
      state[key] = value
    }, metadata)
  }

  applyState(state: ClientUndoState | undefined, metadata?: ClientUndoMetadata) {
    if (!state) return

    this.assertRegisteredState(state)
    this.travels.setState(() => state, metadata)
  }

  applyStateWithoutHistory(state: ClientUndoState | undefined) {
    if (!state) return

    this.assertRegisteredState(state)
    this.travels.replaceStateWithoutHistory(() => state)
  }

  archive(metadata?: ClientUndoMetadata) {
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

  batch(metadata: ClientUndoMetadata, callback: () => void) {
    this.travels.transaction(metadata, callback)
  }

  subscribe(listener: ClientUndoListener) {
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

  private syncSlices(state: ClientUndoState) {
    this.slices.forEach((slice, key) => {
      const nextState = state[key] as object | undefined
      if (!nextState) return

      slice.sync(nextState)
    })
  }

  private syncTargetWithSlice<
    TTarget extends object,
    TField extends keyof TTarget & string,
  >(
    slice: ClientUndoSlice<Pick<TTarget, TField>>,
    target: TTarget,
    fields: TField[],
  ) {
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
    const targetRecord = target as ClientUndoTarget
    return Object.fromEntries(
      fields.map((field) => [field, this.clone(targetRecord[field])]),
    ) as Pick<TTarget, TField>
  }

  private clone<T>(state: T) {
    return structuredClone(toJS(state))
  }

  private assertRegistered(key: string) {
    if (this.slices.has(key)) return
    throw new Error(`ClientUndo: "${key}" is not registered.`)
  }

  private assertRegisteredState(state: ClientUndoState) {
    Object.keys(state).forEach((key) => this.assertRegistered(key))
  }

  private assertCanRegister() {
    if (!this.canUndo && !this.canRedo && !this.canArchive) return
    throw new Error('ClientUndo: register slices before editing undo state.')
  }
}

export const ClientUndo = autoBind(new ClientUndoService())
