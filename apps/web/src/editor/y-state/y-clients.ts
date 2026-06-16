import { Disposer } from '@gitborlando/toolkit/disposer'
import { listen } from '@gitborlando/utils/browser'
import autobind from 'class-autobind-decorator'
import equal from 'fast-deep-equal'
import { ClientUndo } from 'src/editor/editor/client-undo'
import { HandleSelect } from 'src/editor/handle/select'
import { StageViewport } from 'src/editor/stage/viewport'
import { YSync } from 'src/editor/y-state/y-sync'
import { UserService } from 'src/global/service/user'

export type UndoClientState = {
  selectIds: Record<string, boolean>
  selectPageId: string
}

@autobind
class YClientsService {
  clientId!: number

  @observable client: S.Client = {
    selectIdMap: {},
    selectPageId: '',
    cursor: XY.$(0, 0),
    color: COLOR.random(),
    sceneMatrix: StageViewport.sceneMatrix,
    userId: '',
    userName: '',
    userAvatar: '',
  }
  @observable others: S.Clients = {}
  @observable observingClientId?: number

  @computed get selectIdList() {
    return Object.keys(this.client.selectIdMap)
  }
  @computed get allSelectIdMap() {
    return {
      ...this.client.selectIdMap,
      ...Object.values(this.others).reduce((acc, client) => {
        return { ...acc, ...client.selectIdMap }
      }, {}),
    }
  }
  @computed get observingClient() {
    const others = this.others
    if (!this.observingClientId) return
    return others[this.observingClientId]
  }

  afterSelect = Signal.create<void>()

  init() {
    const disposeSelect = HandleSelect.subscribe(() => this.syncSelectState())
    runInAction(() => {
      this.client.userId = UserService.userId
      this.client.userName = UserService.userName
      this.client.userAvatar = UserService.avatar
    })
    HandleSelect.selectPage(YState.state.meta.pageIds[0])
    ClientUndo.rebase()
    this.syncSelectState()
    return Disposer.combine(this.onMouseMove(), disposeSelect)
  }

  select(id: string) {
    HandleSelect.select(id)
  }

  unSelect(id: string) {
    HandleSelect.unselect(id)
  }

  clearSelect() {
    HandleSelect.clearSelect()
  }

  selectPage(id: string) {
    HandleSelect.selectPage(id)
  }

  private syncSelectState() {
    this.client.selectIdMap = HandleSelect.state.selectIdMap
    this.client.selectPageId = HandleSelect.selectPageId
    this.afterSelect.dispatch()
  }

  syncSelf() {
    YSync.awareness.setLocalState(toJS(this.client))

    const clientKeys = Object.keys(this.client) as (keyof S.Client)[]
    const commonKeys = clientKeys.filter((key) => key !== 'selectIdMap')
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
      this.afterSelect.hook(() => {
        YSync.awareness.setLocalStateField(
          'selectIdMap',
          toJS(this.client.selectIdMap),
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

export const YClients = makeObservable(new YClientsService())
