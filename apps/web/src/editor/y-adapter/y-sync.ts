import { Signal } from '@gitborlando/signal'
import { Disposer } from '@gitborlando/toolkit/disposer'
import { HocuspocusProvider } from '@hocuspocus/provider'
import type { EditorServiceGetters } from 'src/editor'
import { Service } from 'src/global/service'
import { Awareness } from 'y-protocols/awareness.js'
import * as Y from 'yjs'

export class YSyncService extends Service {
  inited$ = Signal.create(false)

  provider!: HocuspocusProvider
  awareness!: Awareness

  constructor(private readonly getYClients: EditorServiceGetters['getYClients']) {
    super()
    autoBind(this)
  }

  init(fileId: string, document: Y.Doc) {
    this.provider = new HocuspocusProvider({
      url: 'wss://api.gitborlando.com', //'ws://localhost:1234',
      name: fileId,
      document,
    })
    this.awareness = this.provider.awareness!
    const yClients = this.getYClients()

    const disposer = Disposer.combine(yClients.syncSelf(), yClients.syncOthers())
    return disposer
  }
}
