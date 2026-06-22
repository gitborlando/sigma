import { Disposer } from '@gitborlando/toolkit/disposer'
import { listen } from '@gitborlando/utils/browser'
import equal from 'fast-deep-equal'
import { MobxUndo } from 'src/editor/core/undo'
import { HandleSelect } from 'src/editor/handle/select'
import { Matrix } from 'src/editor/geometry'
import { YState } from 'src/editor/y-state/y-state'
import { YSync } from 'src/editor/y-state/y-sync'
import { UserService } from 'src/global/service/user'
import { COLOR } from 'src/utils/color'

class YClientsService {
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
        selectIdMap: HandleSelect.selectIdMap,
        selectPageId: HandleSelect.selectPageId,
      }),
      () => this.syncSelectState(),
    )
    runInAction(() => {
      this.client.userId = UserService.userId
      this.client.userName = UserService.userName
      this.client.userAvatar = UserService.avatar
    })
    HandleSelect.selectPage(YState.state.meta.pageIds[0])
    MobxUndo.rebase()
    this.syncSelectState()
    return Disposer.combine(this.onMouseMove(), disposeSelect)
  }

  private syncSelectState() {
    this.client.selectIdMap = HandleSelect.selectIdMap
    this.client.selectPageId = HandleSelect.selectPageId
  }

  syncSelf() {
    YSync.awareness.setLocalState(toJS(this.client))

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
            YSync.awareness.setLocalStateField(key, toJS(value))
          },
        ),
      )
    })
    disposer.add(
      HandleSelect.afterSelect.hook(() => {
        YSync.awareness.setLocalStateField(
          'selectIdMap',
          toJS(HandleSelect.selectIdMap),
        )
        YSync.awareness.setLocalStateField(
          'selectPageId',
          toJS(HandleSelect.selectPageId),
        )
      }),
    )
    disposer.add(() => YSync.awareness.destroy())

    return disposer.dispose
  }

  syncOthers() {
    let prev: S.Clients = this.others
    const onUpdate = () => {
      const states = YSync.awareness.getStates()
      states.delete(this.clientId)
      const others = Object.fromEntries(states.entries()) as S.Clients
      if (!equal(prev, others)) {
        this.others = others
        prev = others
      }
    }
    YSync.awareness.on('update', onUpdate)
    return () => {
      YSync.awareness.off('update', onUpdate)
    }
  }

  private onMouseMove() {
    return listen('mousemove', (e) => (this.client.cursor = XY.client(e)))
  }
}

export const YClients = autoBind(makeObservable(new YClientsService()))
