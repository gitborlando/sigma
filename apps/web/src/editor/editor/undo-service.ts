import { matchCase } from '@gitborlando/utils'
import autoBind from 'auto-bind'
import { computed, makeObservable, observable, runInAction, toJS } from 'mobx'
import { ClientUndo, type ClientUndoState } from 'src/editor/editor/client-undo'
import type { ImmutPatch } from 'src/utils/immut/immut'
import * as Y from 'yjs'

export type UndoType = 'undo' | 'redo'

export type UndoInfo = {
  type: 'state' | 'client' | 'all'
  description: string
  clientState?: ClientUndoState
  statePatches?: ImmutPatch[]
}

type StateUndoConfig = {
  stateMap: Y.Map<S.Schema>
  getPatches: () => ImmutPatch[]
}

class UndoImpl {
  @observable.shallow stack: UndoInfo[] = []
  @observable next = 0

  private stateUndo?: Y.UndoManager
  private getStatePatches?: () => ImmutPatch[]
  private shouldTrack = true

  @computed get canUndo() {
    return this.next > 0
  }

  @computed get canRedo() {
    return this.next < this.stack.length
  }

  initStateUndo({ stateMap, getPatches }: StateUndoConfig) {
    this.stack = []
    this.next = 0
    this.getStatePatches = getPatches
    this.stateUndo = new Y.UndoManager(stateMap)
  }

  undo() {
    if (!this.canUndo) return

    const info = this.stack[--this.next]
    this.replayInfo('undo', info)
  }

  redo() {
    if (!this.canRedo) return

    const info = this.stack[this.next++]
    this.replayInfo('redo', info)
  }

  track(type: UndoInfo['type'], description: string) {
    if (!this.shouldTrack) return

    const info: UndoInfo = { type, description }

    if (type === 'state' || type === 'all') {
      this.stateUndo?.stopCapturing()
      info.statePatches = this.getStatePatches?.()
    }
    if (type === 'client' || type === 'all') {
      ClientUndo.archive()
      info.clientState = toJS(ClientUndo.state)
    }

    this.stack.splice(this.next, this.stack.length - this.next, info)
    this.next = this.stack.length
  }

  restoreHistory(stack: UndoInfo[], next: number) {
    runInAction(() => {
      this.stack = stack
      this.next = Math.min(next, stack.length)
    })
  }

  untrack(callback: () => void) {
    this.shouldTrack = false
    try {
      runInAction(() => callback())
    } finally {
      this.shouldTrack = true
    }
  }

  private replayInfo(type: UndoType, info: UndoInfo | undefined) {
    if (!info) return

    const replayYState = () => this.stateUndo?.[type]()
    const replayClientState = () => ClientUndo[type]()

    matchCase(info.type, {
      state: () => replayYState(),
      client: () => replayClientState(),
      all: () => {
        if (type === 'undo') {
          replayClientState()
          replayYState()
        } else {
          replayYState()
          replayClientState()
        }
      },
    })()
  }
}

export const Undo = autoBind(makeObservable(new UndoImpl()))
