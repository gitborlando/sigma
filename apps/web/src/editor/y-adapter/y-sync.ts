import { Signal } from '@gitborlando/signal'
import { Disposer } from '@gitborlando/toolkit/disposer'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { Awareness } from 'y-protocols/awareness.js'
import * as Y from 'yjs'
import { EditorService } from '..'

export class YSyncService extends EditorService {
  inited$ = Signal.create(false)

  provider!: HocuspocusProvider
  awareness!: Awareness

  init(fileId: string, document: Y.Doc) {
    this.provider = new HocuspocusProvider({
      url: 'wss://api.gitborlando.com', //'ws://localhost:1234',
      name: fileId,
      document,
    })
    this.awareness = this.provider.awareness!

    const disposer = Disposer.combine(
      this.editor.yClients.syncSelf(),
      this.editor.yClients.syncOthers(),
    )
    return disposer
  }
}
