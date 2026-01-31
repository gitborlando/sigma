import { clone } from '@gitborlando/utils'
import { computed, observable } from 'mobx'
import { NeedUndoClientState, YClients } from 'src/editor/y-state/y-clients'
import { ImmutPatch } from 'src/utils/immut/immut'
import * as Y from 'yjs'

export type YUndoInfo = {
  type: 'state' | 'client' | 'all'
  description: string
  clientState?: NeedUndoClientState
  statePatches?: ImmutPatch[]
}

class YUndoService {
  stack: YUndoInfo[] = []
  @observable next = 0

  @computed get canUndo() {
    return this.next > 0
  }
  @computed get canRedo() {
    return this.next < this.stack.length
  }

  private stateUndo!: Y.UndoManager

  initStateUndo(stateMap: Y.Map<S.Schema>) {
    this.stateUndo = new Y.UndoManager(stateMap)
  }

  initClientUndo() {
    this.initClientState = this.getClientState()
  }

  private initClientState!: NeedUndoClientState

  private getClientState() {
    return clone({
      selectIds: YClients.client.selectIdMap,
      selectPageId: YClients.client.selectPageId,
    })
  }

  @action
  private applyClientState() {
    const clientState =
      this.stack[this.next - 1]?.clientState || this.initClientState
    YClients.client.selectIdMap = clientState.selectIds
    YClients.client.selectPageId = clientState.selectPageId
  }

  undo() {
    this.next = Math.max(this.next - 1, 0)
    const { type } = this.stack[this.next]
    if (type === 'state') this.stateUndo.undo()
    if (type === 'client') this.applyClientState()
    if (type === 'all') {
      this.stateUndo.undo()
      this.applyClientState()
    }
  }

  redo() {
    this.next = Math.min(this.next + 1, this.stack.length)
    const { type } = this.stack[this.next - 1]
    if (type === 'state') this.stateUndo.redo()
    if (type === 'client') this.applyClientState()
    if (type === 'all') {
      this.applyClientState()
      this.stateUndo.redo()
    }
  }

  private shouldTrack = true

  track(info: YUndoInfo) {
    if (!this.shouldTrack) return

    const { type } = info

    if (type === 'state' || type === 'all') {
      this.stateUndo.stopCapturing()
      info.statePatches = YState.getPatches()
    }
    if (type === 'client' || type === 'all') {
      info.clientState = this.getClientState()
    }

    this.stack.splice(this.next, this.stack.length - this.next, info)
    this.next = this.stack.length
  }

  track2(type: YUndoInfo['type'], description: string) {
    if (!this.shouldTrack) return

    const info: YUndoInfo = { type, description }

    if (type === 'state' || type === 'all') {
      this.stateUndo.stopCapturing()
      info.statePatches = YState.getPatches()
    }
    if (type === 'client' || type === 'all') {
      info.clientState = this.getClientState()
    }

    this.stack.splice(this.next, this.stack.length - this.next, info)
    this.next = this.stack.length
  }

  untrack(callback: () => void) {
    this.shouldTrack = false
    runInAction(() => callback())
    this.shouldTrack = true
  }
}

export const YUndo = autoBind(makeObservable(new YUndoService()))
