import { Disposer } from '@gitborlando/toolkit/disposer'
import { listen } from '@gitborlando/utils/browser'
import equal from 'fast-deep-equal'
import { MobxUndo } from 'src/editor/core/undo'
import { Matrix } from 'src/editor/geometry'
import { HandleSelectService } from 'src/editor/handle/select'
import { Service } from 'src/global/service'
import { UserService } from 'src/global/service/user'
import { COLOR } from 'src/utils/color'
import { YSyncService } from './y-sync'

export class YClientsService extends Service {
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

  constructor(
    private readonly handleSelect: HandleSelectService,
    private readonly ySync: YSyncService,
  ) {
    super()
    makeObservable(this)
    autoBind(this)
  }

  setup() {
    this.effect(
      reaction(
        () => ({
          selectIdMap: this.handleSelect.selectIdMap,
          selectPageId: this.handleSelect.selectPageId,
        }),
        () => this.syncSelectState(),
      ),
    )
    runInAction(() => {
      this.client.userId = UserService.userId
      this.client.userName = UserService.userName
      this.client.userAvatar = UserService.avatar
    })
    MobxUndo.rebase()
    this.syncSelectState()
    this.effect(this.onMouseMove())
  }

  private syncSelectState = () => {
    this.client.selectIdMap = this.handleSelect.selectIdMap
    this.client.selectPageId = this.handleSelect.selectPageId
  }

  syncSelf = () => {
    this.ySync.awareness.setLocalState(toJS(this.client))

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
            this.ySync.awareness.setLocalStateField(key, toJS(value))
          },
        ),
      )
    })
    disposer.add(
      this.handleSelect.afterSelect.hook(() => {
        this.ySync.awareness.setLocalStateField(
          'selectIdMap',
          toJS(this.handleSelect.selectIdMap),
        )
        this.ySync.awareness.setLocalStateField(
          'selectPageId',
          toJS(this.handleSelect.selectPageId),
        )
      }),
    )
    disposer.add(() => this.ySync.awareness.destroy())

    return disposer.dispose
  }

  syncOthers = () => {
    let prev: S.Clients = this.others
    const onUpdate = () => {
      const states = this.ySync.awareness.getStates()
      states.delete(this.clientId)
      const others = Object.fromEntries(states.entries()) as S.Clients
      if (!equal(prev, others)) {
        this.others = others
        prev = others
      }
    }
    this.ySync.awareness.on('update', onUpdate)
    return () => {
      this.ySync.awareness.off('update', onUpdate)
    }
  }

  private onMouseMove = () => {
    return listen('mousemove', (e) => (this.client.cursor = XY.client(e)))
  }
}
