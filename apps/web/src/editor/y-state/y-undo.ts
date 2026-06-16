import { matchCase } from '@gitborlando/utils'
import { computed, observable } from 'mobx'
import { ClientUndo, type ClientUndoState } from 'src/editor/editor/client-undo'
import { ImmutPatch } from 'src/utils/immut/immut'
import * as Y from 'yjs'

export type UndoType = 'undo' | 'redo'

export type YUndoInfo = {
  type: 'state' | 'client' | 'all'
  description: string
  clientState?: ClientUndoState
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

  private replayInfo(type: UndoType, info: YUndoInfo | undefined) {
    if (!info) return

    const replayYState = () => this.stateUndo[type]()
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

  private shouldTrack = true

  track(type: YUndoInfo['type'], description: string) {
    if (!this.shouldTrack) return

    const info: YUndoInfo = { type, description }

    if (type === 'state' || type === 'all') {
      this.stateUndo.stopCapturing()
      info.statePatches = YState.getPatches()
    }
    if (type === 'client' || type === 'all') {
      ClientUndo.archive()
      info.clientState = toJS(ClientUndo.state)
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
