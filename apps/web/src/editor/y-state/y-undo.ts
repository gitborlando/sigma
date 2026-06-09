import { clone } from '@gitborlando/utils'
import { computed, observable } from 'mobx'
import { type UndoClientState, YClients } from 'src/editor/y-state/y-clients'
import { ImmutPatch } from 'src/utils/immut/immut'
import * as Y from 'yjs'

export type YUndoInfo = {
  type: 'state' | 'client' | 'all'
  description: string
  clientState?: UndoClientState
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
    this.stack = []
    this.next = 0
    this.stateUndo = new Y.UndoManager(stateMap)
  }

  initClientUndo() {
    this.initClientState = this.getClientState()
  }

  private initClientState!: UndoClientState

  private getClientState() {
    return clone({
      selectIds: YClients.client.selectIdMap,
      selectPageId: YClients.client.selectPageId,
    })
  }

  @action
  private applyClientState(clientState: UndoClientState) {
    YClients.client.selectIdMap = clone(clientState.selectIds)
    YClients.client.selectPageId = clientState.selectPageId
    YClients.afterSelect.dispatch()
  }

  private clientStateExists(clientState: UndoClientState) {
    return Object.keys(clientState.selectIds).every((id) => YState.state[id])
  }

  private replayInfo(info: YUndoInfo, replayState: () => void) {
    const clientState = info.clientState || this.initClientState
    switch (info.type) {
      case 'state':
        replayState()
        return
      case 'client':
        this.applyClientState(clientState)
        return
      case 'all':
        if (this.clientStateExists(clientState)) {
          this.applyClientState(clientState)
          replayState()
        } else {
          replayState()
          this.applyClientState(clientState)
        }
    }
  }

  undo() {
    if (!this.canUndo) return

    const info = this.stack[this.next-- - 1]
    this.replayInfo(info, () => this.stateUndo.undo())
  }

  redo() {
    if (!this.canRedo) return

    const info = this.stack[this.next++]
    this.replayInfo(info, () => this.stateUndo.redo())
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
    try {
      runInAction(() => callback())
    } finally {
      this.shouldTrack = true
    }
  }
}

export const YUndo = autoBind(makeObservable(new YUndoService()))
