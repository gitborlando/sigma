import { HocuspocusProvider } from '@hocuspocus/provider'
import { Service } from 'src/global/service'
import { Awareness } from 'y-protocols/awareness.js'
import * as Y from 'yjs'

const DEFAULT_PROVIDER_URL = 'wss://api.gitborlando.com'

export class YSyncService extends Service {
  provider?: HocuspocusProvider
  awareness?: Awareness

  constructor() {
    super()
    autoBind(this)
  }

  init(fileId: string, document: Y.Doc) {
    this.provider = new HocuspocusProvider({
      url: DEFAULT_PROVIDER_URL,
      name: fileId,
      document,
    })
    this.awareness = this.provider.awareness!

    const provider = this.provider
    provider.on('synced', () => {})
    provider.on('status', () => {})
    this.effect(() => {
      provider.off('synced', () => {})
      provider.off('status', () => {})
    })
  }
}
