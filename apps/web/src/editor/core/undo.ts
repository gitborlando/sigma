import { MobxUndo, MobxUndoState } from '@gitborlando/mobx-undo'
import { matchCase } from '@gitborlando/utils'
import { computed, makeObservable, observable, runInAction, toJS } from 'mobx'
import { YState, YStatePatch } from 'src/editor/y-adapter/y-state'
import { Y_STATE_LOCAL_ORIGIN } from 'src/global/constant'
import { Service } from 'src/global/service'
import * as Y from 'yjs'

export type UndoType = 'undo' | 'redo'

export type UndoInfo = {
  type: 'state' | 'client' | 'all'
  description: string
  clientState?: MobxUndoState
  statePatches?: YStatePatch[]
}

@reflection
export class Undo extends Service {
  @observable.shallow stack: UndoInfo[] = []
  @observable next = 0

  mobxUndo = autoBind(new MobxUndo())
  yUndo?: Y.UndoManager

  private shouldTrack = true

  constructor(private readonly yState: YState) {
    super()
    autoBind(makeObservable(this))
    this.effect(() => this.mobxUndo.dispose())
    this.effect(() => this.yUndo?.destroy())
  }

  @computed get canUndo() {
    return this.next > 0
  }

  @computed get canRedo() {
    return this.next < this.stack.length
  }

  setup() {
    this.yUndo?.destroy()
    this.yUndo = new Y.UndoManager(this.yState.doc.getMap('schema'), {
      trackedOrigins: new Set([null, Y_STATE_LOCAL_ORIGIN]),
    })
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
      this.yUndo?.stopCapturing()
      info.statePatches = this.yState.getPatches()
    }
    if (type === 'client' || type === 'all') {
      this.mobxUndo.archive()
      info.clientState = toJS(this.mobxUndo.state)
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

    const replayYState = () => this.yUndo?.[type]()
    const replayClientState = () => this.mobxUndo[type]()

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
    })?.()
  }
}
