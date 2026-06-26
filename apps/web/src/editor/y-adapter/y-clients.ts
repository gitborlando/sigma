import { Disposer } from '@gitborlando/toolkit/disposer'
import { listen } from '@gitborlando/utils/browser'
import equal from 'fast-deep-equal'
import { MobxUndo } from 'src/editor/core/undo'
import { Matrix } from 'src/editor/geometry'
import { UserService } from 'src/global/service/user'
import { COLOR } from 'src/utils/color'
import { EditorService } from '..'

export class YClientsService extends EditorService {
  clientId!: number

  @observable client: S.Client = {
    selectIdMap: {},
    selectPageId: '',
    cursor: XY.$(0, 0),
    color: COLOR.random(),
    sceneMatrix: Matrix.identity(),
    userId: '',
    userName: '',
    userAvatar: '',
  }
  @observable others: S.Clients = {}
  @observable observingClientId?: number

  @computed get observingClient() {
    const others = this.others
    if (!this.observingClientId) return
    return others[this.observingClientId]
  }

  subscribe() {
    const disposeSelect = reaction(
      () => ({
        selectIdMap: this.editor.handleSelect.selectIdMap,
        selectPageId: this.editor.handleSelect.selectPageId,
      }),
      () => this.syncSelectState(),
    )
    runInAction(() => {
      this.client.userId = UserService.userId
      this.client.userName = UserService.userName
      this.client.userAvatar = UserService.avatar
    })
    this.editor.handleSelect.selectPage(this.editor.yState.state.meta.pageIds[0])
    MobxUndo.rebase()
    this.syncSelectState()
    return Disposer.combine(this.onMouseMove(), disposeSelect)
  }

  private syncSelectState() {
    this.client.selectIdMap = this.editor.handleSelect.selectIdMap
    this.client.selectPageId = this.editor.handleSelect.selectPageId
  }

  syncSelf() {
    this.editor.ySync.awareness.setLocalState(toJS(this.client))

    const clientKeys = Object.keys(this.client) as (keyof S.Client)[]
    const commonKeys = clientKeys.filter(
      (key) => key !== 'selectIdMap' && key !== 'selectPageId',
    )
    const disposer = new Disposer()

    commonKeys.map((key) => {
      disposer.add(
        reaction(
          () => this.client[key],
          (value) => {
            this.editor.ySync.awareness.setLocalStateField(key, toJS(value))
          },
        ),
      )
    })
    disposer.add(
      this.editor.handleSelect.afterSelect.hook(() => {
        this.editor.ySync.awareness.setLocalStateField(
          'selectIdMap',
          toJS(this.editor.handleSelect.selectIdMap),
        )
        this.editor.ySync.awareness.setLocalStateField(
          'selectPageId',
          toJS(this.editor.handleSelect.selectPageId),
        )
      }),
    )
    disposer.add(() => this.editor.ySync.awareness.destroy())

    return disposer.dispose
  }

  syncOthers() {
    let prev: S.Clients = this.others
    const onUpdate = () => {
      const states = this.editor.ySync.awareness.getStates()
      states.delete(this.clientId)
      const others = Object.fromEntries(states.entries()) as S.Clients
      if (!equal(prev, others)) {
        this.others = others
        prev = others
      }
    }
    this.editor.ySync.awareness.on('update', onUpdate)
    return () => {
      this.editor.ySync.awareness.off('update', onUpdate)
    }
  }

  private onMouseMove() {
    return listen('mousemove', (e) => (this.client.cursor = XY.client(e)))
  }
}
