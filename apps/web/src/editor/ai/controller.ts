import { Service } from '@gitborlando/di-service'
import { createZodStorage } from '@gitborlando/toolkit'
import { makeObservable, observable } from 'mobx'
import { ViewportAction } from '../action/viewport'
import { Select } from '../select'
import { Session } from '../session'
import { YDoc } from '../y-adapter/y-doc'
import { AiEdit } from './apply-edit'
import { requestAiEdit } from './client'
import { clearAiDraft, readAiDraft, writeAiDraft, type AiDraft } from './draft'
import { AiPreview } from './preview'
import { readAiPage, readAiPageMarker } from './read-page'
import { aiConfigSchema, type AiConfig, type AiTarget } from './schema'

const storage = createZodStorage('editor.ai', aiConfigSchema)

const defaultConfig = (): AiConfig => ({
  baseURL: 'https://api.openai.com/v1',
  model: '',
  apiKey: '',
})

type Pending = AiDraft & { controller: AbortController; doc: YDoc['yDoc'] }

// One generation: read the page, stream a completion, preview it, then commit once.
@reflection
export class AiController extends Service {
  @observable phase: 'idle' | 'streaming' = 'idle'
  @observable target: AiTarget = 'new'
  @observable prompt = ''
  @observable message = ''
  @observable.ref config: AiConfig = defaultConfig()

  private request?: AbortController
  private pending?: Pending

  constructor(
    private readonly aiEdit: AiEdit,
    private readonly aiPreview: AiPreview,
    private readonly yDoc: YDoc,
    private readonly select: Select,
    private readonly session: Session,
    private readonly viewportAction: ViewportAction,
  ) {
    super()
    autoBind(makeObservable(this))
    const saved = storage.read()
    if (saved) this.config = saved
    if (localStorage.getItem('editor.ai.target') === 'current')
      this.target = 'current'
  }

  get busy() {
    return this.phase !== 'idle'
  }

  attach() {
    this.restore()
    return () => this.detach()
  }

  setPrompt(value: string) {
    this.prompt = value
  }

  setTarget(value: string) {
    if (value !== 'new' && value !== 'current') return
    this.target = value
    localStorage.setItem('editor.ai.target', value)
  }

  setConfig(key: keyof AiConfig, value: string) {
    this.config = { ...this.config, [key]: value }
    storage.save(this.config)
  }

  // Panel close commits whatever has already streamed, and ignores the aborted response.
  stop() {
    this.request?.abort()
    try {
      if (this.savePartial()) this.message = t('AI partial saved')
      this.aiPreview.clear()
    } catch (error) {
      this.message = error instanceof Error ? error.message : t('Edit failed')
    }
    this.request = undefined
    this.phase = 'idle'
  }

  async send() {
    if (!this.request && this.pending?.operations.length) {
      try {
        if (!this.savePartial()) return
      } catch (error) {
        this.message = error instanceof Error ? error.message : t('Edit failed')
        return
      }
    }
    this.request?.abort()
    const controller = new AbortController()
    this.request = controller
    let timer: ReturnType<typeof setTimeout> | undefined
    const resetTimer = () => {
      clearTimeout(timer)
      timer = setTimeout(() => controller.abort(), 180000)
    }
    resetTimer()
    const sessionId = this.session.sessionId
    const currentDoc = this.yDoc.yDoc
    const pageId = this.select.selectPageId
    const target = this.target
    this.phase = 'streaming'
    this.message = ''
    try {
      const snapshot =
        target === 'current' ? readAiPage(this.yDoc.doc, pageId) : undefined
      const marker = snapshot && readAiPageMarker(this.yDoc.doc, pageId)
      this.aiPreview.begin(target, snapshot)
      this.pending = {
        controller,
        operations: [],
        target,
        pageId,
        marker,
        sessionId,
        doc: currentDoc,
      }
      let lastPreview = 0
      let lastDraft = 0
      const result = await requestAiEdit(
        this.config,
        this.prompt,
        snapshot,
        controller.signal,
        (operations) => {
          if (this.request !== controller || controller.signal.aborted) return
          if (this.pending?.controller === controller)
            this.pending.operations = operations
          const now = Date.now()
          if (now - lastDraft >= 500) {
            lastDraft = now
            this.writeDraft()
          }
          if (now - lastPreview >= 100) {
            lastPreview = now
            this.aiPreview.update([...operations])
          }
        },
        resetTimer,
      )
      if (this.request !== controller) return
      if (controller.signal.aborted)
        throw new Error(t('Network request failed or timed out'))
      if (this.session.sessionId !== sessionId || this.yDoc.yDoc !== currentDoc)
        return
      this.message = this.aiEdit.apply(result, target, pageId, marker)
      this.pending = undefined
      this.clearDraft()
      if (target === 'new')
        this.fitNewPage(sessionId, currentDoc, this.select.selectPageId)
    } catch (error) {
      if (this.request === controller) {
        this.writeDraft()
        try {
          if (this.savePartial()) this.message = t('AI partial saved')
          else
            this.message = error instanceof Error ? error.message : t('Edit failed')
        } catch (saveError) {
          this.message =
            saveError instanceof Error ? saveError.message : t('Edit failed')
        }
      }
    } finally {
      clearTimeout(timer)
      if (this.request === controller) {
        if (!this.pending?.operations.length) {
          this.pending = undefined
          this.aiPreview.clear()
        }
        this.request = undefined
        this.phase = 'idle'
      }
    }
  }

  // Unmount keeps the controller so the aborted send can still commit a partial edit.
  private detach() {
    this.writeDraft()
    this.request?.abort()
    this.aiPreview.clear()
  }

  private restore() {
    try {
      const saved = readAiDraft(this.session.sessionId)
      if (!saved) return
      this.pending = {
        ...saved,
        controller: new AbortController(),
        doc: this.yDoc.yDoc,
      }
      if (
        saved.target === 'current' &&
        readAiPageMarker(this.yDoc.doc, saved.pageId) === saved.marker &&
        this.select.selectPageId !== saved.pageId
      )
        this.select.selectPage(saved.pageId)
      if (this.savePartial()) this.message = t('AI partial restored')
    } catch {
      this.message = t('AI partial recovery failed')
    }
  }

  private savePartial() {
    const current = this.pending
    if (!current?.operations.length) return false
    if (
      this.session.sessionId !== current.sessionId ||
      this.yDoc.yDoc !== current.doc
    )
      return false
    this.aiEdit.apply(
      { summary: t('AI partial edit'), operations: current.operations },
      current.target,
      current.pageId,
      current.marker,
    )
    this.pending = undefined
    this.clearDraft()
    if (current.target === 'new')
      this.fitNewPage(current.sessionId, current.doc, this.select.selectPageId)
    return true
  }

  private fitNewPage(sessionId: string, doc: YDoc['yDoc'], pageId: string) {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (
          this.session.sessionId === sessionId &&
          this.yDoc.yDoc === doc &&
          this.select.selectPageId === pageId
        )
          this.viewportAction.zoomToFitAll()
      }),
    )
  }

  private writeDraft() {
    const current = this.pending
    if (!current?.operations.length) return
    writeAiDraft(this.session.sessionId, {
      operations: current.operations,
      target: current.target,
      pageId: current.pageId,
      marker: current.marker,
      sessionId: current.sessionId,
    })
  }

  private clearDraft() {
    clearAiDraft(this.session.sessionId)
  }
}
