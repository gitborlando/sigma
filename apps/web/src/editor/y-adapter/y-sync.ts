import { Service } from '@gitborlando/di-service'
import { FileAPI } from '@sigma/api'
import { makeObservable, observable, runInAction } from 'mobx'
import * as Y from 'yjs'
import { YDoc } from './y-doc'

const CLOUD_ORIGIN = Symbol('cloud')
const SAVE_INTERVAL = 10_000
const MAX_ATTEMPTS = 3

type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error'

class FileSync {
  private dirty = false
  private generation = 0
  private revision?: number
  private requested = false
  private running?: Promise<void>
  private closed = false
  private initializing = true
  private ready!: Promise<void>
  private readonly timer: ReturnType<typeof setInterval>
  private readonly unregister: () => void
  private document: Y.Doc

  constructor(
    private readonly fileAPI: FileAPI,
    private readonly fileId: string,
    private readonly yDoc: YDoc,
    private readonly setStatus: (status: SyncStatus) => void,
  ) {
    this.document = yDoc.yDoc
    this.document.on('update', this.onUpdate)
    window.addEventListener('pagehide', this.onPageHide)
    this.unregister = yDoc.beforeDestroy$.hook(this.close)
    this.timer = setInterval(this.requestSync, SAVE_INTERVAL)
    this.ready = this.load()
  }

  async start() {
    await this.ready
  }

  private onUpdate = (_update: Uint8Array, origin: unknown) => {
    if (origin === CLOUD_ORIGIN) return
    this.dirty = true
    this.generation++
    this.setStatus('pending')
  }

  private async load() {
    try {
      const { content, revision } = await this.fileAPI.getContent(this.fileId)
      const remote = new Y.Doc()
      try {
        Y.applyUpdate(remote, content)
        Y.applyUpdate(this.document, content, CLOUD_ORIGIN)
        this.dirty = !Y.equalSnapshots(Y.snapshot(this.document), Y.snapshot(remote))
      } finally {
        remote.destroy()
      }
      this.revision = revision
      this.setStatus(this.dirty ? 'pending' : 'synced')
    } catch (error) {
      console.error('Failed to load cloud file', error)
      this.dirty = this.document.getMap('doc').size > 0
      this.setStatus('error')
    } finally {
      this.initializing = false
    }
  }

  private onPageHide = () => {
    if (
      this.running ||
      this.initializing ||
      !this.dirty ||
      this.revision === undefined
    )
      return
    if (!this.document.getMap('doc').size) return
    const snapshot = Y.encodeStateAsUpdate(this.document)
    this.running = this.fileAPI
      .saveContent(this.fileId, snapshot, this.revision, true)
      .then(() => {})
      .catch((error) => console.error('Failed to send file on pagehide', error))
      .finally(() => {
        this.running = undefined
        if (this.requested) this.requestSync()
      })
  }

  requestSync = () => {
    this.requested = true
    if (this.running) return
    this.running = this.run().finally(() => {
      this.running = undefined
      if (this.closed) this.document.destroy()
      else if (this.requested) this.requestSync()
    })
  }

  private async run() {
    await this.ready
    try {
      do {
        this.requested = false
        await this.sync()
      } while (this.requested || this.dirty)
    } catch (error) {
      this.requested = false
      console.error('Failed to sync cloud file', error)
      this.setStatus('error')
    }
  }

  private async sync() {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const revision = await this.fileAPI.getRevision(this.fileId)
      if (revision !== this.revision) {
        const remote = await this.fileAPI.getContent(this.fileId)
        const check = new Y.Doc()
        try {
          Y.applyUpdate(check, remote.content)
          Y.applyUpdate(this.document, remote.content, CLOUD_ORIGIN)
        } finally {
          check.destroy()
        }
        this.revision = remote.revision
      }
      if (!this.dirty) {
        this.setStatus('synced')
        return
      }
      if (!this.document.getMap('doc').size || this.revision === undefined)
        throw new Error('File content is unavailable')
      this.setStatus('syncing')
      const generation = this.generation
      const saved = await this.fileAPI.saveContent(
        this.fileId,
        Y.encodeStateAsUpdate(this.document),
        this.revision,
      )
      if (!saved) continue
      this.revision++
      this.dirty = this.generation !== generation
      this.setStatus(this.dirty ? 'pending' : 'synced')
      return
    }
    throw new Error('File changed repeatedly while saving')
  }

  close = () => {
    if (this.closed) return
    this.closed = true
    clearInterval(this.timer)
    window.removeEventListener('pagehide', this.onPageHide)
    this.unregister()
    this.document.off('update', this.onUpdate)
    if (!this.dirty && !this.running && !this.initializing) return
    const snapshot = Y.encodeStateAsUpdate(this.document)
    this.document = new Y.Doc()
    Y.applyUpdate(this.document, snapshot)
    this.requestSync()
  }
}

@reflection
export class YSync extends Service {
  @observable status: SyncStatus = 'syncing'
  private current?: FileSync

  constructor(
    private readonly fileAPI: FileAPI,
    private readonly yDoc: YDoc,
  ) {
    super()
    autoBind(makeObservable(this))
    this.effect(() => this.current?.close())
  }

  async setup(fileId: string) {
    this.current?.close()
    const sync = new FileSync(this.fileAPI, fileId, this.yDoc, (status) => {
      if (this.current === sync) runInAction(() => (this.status = status))
    })
    this.current = sync
    await sync.start()
  }
}
