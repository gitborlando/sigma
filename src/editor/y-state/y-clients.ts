import { Is } from '@gitborlando/utils'
import { listen } from '@gitborlando/utils/browser'
import autobind from 'class-autobind-decorator'
import equal from 'fast-deep-equal'
import { StageViewport } from 'src/editor/stage/viewport'
import { YSync } from 'src/editor/y-state/y-sync'
import { UserService } from 'src/global/service/user'
import { Disposer } from 'src/utils/disposer'

export type NeedUndoClientState = {
  selectIds: Record<string, boolean>
  selectPageId: string
}

@autobind
class YClientsService {
  clientId!: number

  @observable client: V1.Client = {
    selectIdMap: {},
    selectPageId: '',
    cursor: XY._(0, 0),
    color: COLOR.random(),
    sceneMatrix: StageViewport.sceneMatrix,
    userId: '',
    userName: '',
    userAvatar: '',
  }
  @observable others: V1.Clients = {}
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
    runInAction(() => {
      this.client.selectPageId = YState.state.meta.pageIds[0]
      this.client.userId = UserService.userId
      this.client.userName = UserService.userName
      this.client.userAvatar = UserService.avatar
    })
    YUndo.initClientUndo()
    return Disposer.collect(this.onMouseMove())
  }

  select(id: string) {
    if (this.client.selectIdMap[id]) return
    this.client.selectIdMap[id] = true

    const name = YState.state[id].name
    YUndo.track({
      type: 'client',
      description: sentence(t('verb.select'), t('noun.node'), ': ', name),
    })
  }

  unSelect(id: string) {
    if (!this.client.selectIdMap[id]) return
    delete this.client.selectIdMap[id]

    const name = YState.state[id].name
    YUndo.track({
      type: 'client',
      description: sentence(t('verb.unselect'), t('noun.node'), ': ', name),
    })
  }

  clearSelect() {
    if (Is.empty(this.client.selectIdMap)) return
    this.client.selectIdMap = {}
  }

  selectPage(id: string) {
    this.client.selectPageId = id
    this.clearSelect()

    YUndo.track({
      type: 'client',
      description: sentence(
        t('verb.select'),
        t('noun.page'),
        ': ',
        YState.state[id].name,
      ),
    })
  }

  syncSelf() {
    YSync.awareness.setLocalState(toJS(this.client))

    const clientKeys = Object.keys(this.client) as (keyof V1.Client)[]
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
    let prev: V1.Clients = this.others
    const onUpdate = () => {
      const states = YSync.awareness.getStates()
      states.delete(this.clientId)
      const others = Object.fromEntries(states.entries()) as V1.Clients
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

export function getSelectIdMap() {
  return YClients.client.selectIdMap
}

export function getSelectIdList() {
  return YClients.selectIdList
}

export function getAllSelectIdMap() {
  return YClients.allSelectIdMap
}

export function getSelectPageId() {
  return YClients.client.selectPageId
}
