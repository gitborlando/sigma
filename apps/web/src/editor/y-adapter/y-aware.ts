import { Disposer } from '@gitborlando/toolkit/disposer'
import { listen } from '@gitborlando/utils/browser'
import equal from 'fast-deep-equal'
import { reflection } from 'first-di'
import { Matrix } from 'src/editor/geometry'
import { HandleSelect } from 'src/editor/handle/select'
import { Service } from 'src/global/service'
import { UserService } from 'src/global/service/user'
import { COLOR } from 'src/utils/color'
import { Awareness } from 'y-protocols/awareness.js'

@reflection
export class YAware extends Service {
  clientId?: number
  awareness?: Awareness

  client: S.Client = this.createClient()
  others: S.Clients = {}
  observingClientId?: number

  get observingClient() {
    const others = this.others
    if (!this.observingClientId) return
    return others[this.observingClientId]
  }

  constructor(private readonly handleSelect: HandleSelect) {
    super()
    makeObservable(this, {
      client: observable,
      others: observable,
      observingClientId: observable,
      observingClient: computed,
    })
    autoBind(this)
  }

  init(option: { clientId: number; awareness?: Awareness }) {
    this.destroyAware()
    this.clientId = option.clientId
    this.awareness = option.awareness

    runInAction(() => {
      this.client = this.createClient()
      this.client.userId = UserService.userId
      this.client.userName = UserService.userName
      this.client.userAvatar = UserService.avatar
    })

    this.effect(
      reaction(
        () => ({
          selectIdMap: this.handleSelect.selectIdMap,
          selectPageId: this.handleSelect.selectPageId,
        }),
        () => this.syncSelectState(),
      ),
      this.onMouseMove(),
      this.syncSelf(),
      this.syncOthers(),
    )

    this.syncSelectState()
  }

  destroyAware() {
    this.awareness?.setLocalState(null)
    this.clientId = undefined
    this.awareness = undefined
    this.others = {}
    this.observingClientId = undefined
    this.disposer.dispose()
  }

  dispose() {
    this.destroyAware()
    super.dispose()
  }

  private createClient(): S.Client {
    return {
      selectIdMap: {},
      selectPageId: '',
      cursor: XY.$(0, 0),
      color: COLOR.random(),
      sceneMatrix: Matrix.identity(),
      userId: '',
      userName: '',
      userAvatar: '',
    }
  }

  private syncSelectState = () => {
    this.client.selectIdMap = this.handleSelect.selectIdMap
    this.client.selectPageId = this.handleSelect.selectPageId
  }

  private syncSelf = () => {
    const awareness = this.awareness
    if (!awareness) return () => {}

    awareness.setLocalState(toJS(this.client))

    const clientKeys = Object.keys(this.client) as (keyof S.Client)[]
    const commonKeys = clientKeys.filter(
      (key) => key !== 'selectIdMap' && key !== 'selectPageId',
    )
    const disposer = new Disposer()

    commonKeys.map((key) => {
      disposer.register(
        reaction(
          () => this.client[key],
          (value) => awareness.setLocalStateField(key, toJS(value)),
        ),
      )
    })
    disposer.register(
      this.handleSelect.afterSelect.hook(() => {
        awareness.setLocalStateField(
          'selectIdMap',
          toJS(this.handleSelect.selectIdMap),
        )
        awareness.setLocalStateField(
          'selectPageId',
          toJS(this.handleSelect.selectPageId),
        )
      }),
    )

    return disposer.dispose
  }

  private syncOthers = () => {
    const awareness = this.awareness
    if (!awareness) return () => {}

    let prev: S.Clients = this.others
    const onUpdate = () => {
      const states = awareness.getStates()
      if (this.clientId) states.delete(this.clientId)
      const others = Object.fromEntries(states.entries()) as S.Clients
      if (!equal(prev, others)) {
        this.others = others
        prev = others
      }
    }
    awareness.on('update', onUpdate)
    return () => awareness.off('update', onUpdate)
  }

  private onMouseMove = () => {
    return listen('mousemove', (e) => (this.client.cursor = XY.client(e)))
  }
}
