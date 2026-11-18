import { createZodStorage } from '@gitborlando/toolkit'
import { Sparkles } from 'lucide-react'
import { aiConfigSchema } from '../../../editor/ai/schema'
import { readAiPage, readAiPageMarker } from '../../../editor/ai/read-page'
import { requestAiEdit } from '../../../editor/ai/client'
import { Btn } from '../../component/btn'
import { DragPanel } from '../../component/drag-panel'
import { Lucide } from '../../component/lucide'
import { Segments } from '../../component/segments'
import { useEditorServices } from '../../hooks/use-services'

const storage = createZodStorage('editor.ai', aiConfigSchema)
const examples = ['AI example 1', 'AI example 2', 'AI example 3', 'AI example 4']

export const AiPanel = () => {
  const { aiEdit, aiPreview, yDoc, select, session, viewportAction } =
    useEditorServices()
  const [show, setShow] = useState(false)
  const panelPosition = useMemo(
    () => ({ x: Math.max(0, window.innerWidth - 416), y: 24 }),
    [],
  )
  const [config, setConfig] = useState(
    () =>
      storage.read() || {
        baseURL: 'https://api.openai.com/v1',
        model: '',
        apiKey: '',
      },
  )
  const [target, setTarget] = useState(() =>
    localStorage.getItem('editor.ai.target') === 'current' ? 'current' : 'new',
  )
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const request = useRef<AbortController>()
  const pending = useRef<{
    controller: AbortController
    operations: unknown[]
    target: 'new' | 'current'
    pageId: string
    marker?: string
    sessionId: string
    doc: typeof yDoc.yDoc
  }>()
  const draftKey = `editor.ai.draft:${session.sessionId}`
  const writeDraft = () => {
    const current = pending.current
    if (!current?.operations.length) return
    try {
      const { operations, target, pageId, marker, sessionId } = current
      localStorage.setItem(
        draftKey,
        JSON.stringify({ operations, target, pageId, marker, sessionId }),
      )
    } catch {
      // The in-memory partial result remains available if local storage is full.
    }
  }
  const clearDraft = () => {
    try {
      localStorage.removeItem(draftKey)
    } catch {
      /* storage may be unavailable */
    }
  }
  const savePartial = () => {
    const current = pending.current
    if (!current || !current.operations.length) return false
    if (session.sessionId !== current.sessionId || yDoc.yDoc !== current.doc)
      return false
    aiEdit.apply(
      { summary: t('AI partial edit'), operations: current.operations },
      current.target,
      current.pageId,
      current.marker,
    )
    pending.current = undefined
    clearDraft()
    const savedPageId = select.selectPageId
    if (current.target === 'new')
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (
            session.sessionId === current.sessionId &&
            yDoc.yDoc === current.doc &&
            select.selectPageId === savedPageId
          )
            viewportAction.zoomToFitAll()
        }),
      )
    return true
  }
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || 'null')
      if (
        saved?.sessionId === session.sessionId &&
        Array.isArray(saved.operations) &&
        saved.operations.length &&
        (saved.target === 'new' || saved.target === 'current')
      ) {
        pending.current = {
          ...saved,
          controller: new AbortController(),
          doc: yDoc.yDoc,
        }
        if (
          saved.target === 'current' &&
          readAiPageMarker(yDoc.doc, saved.pageId) === saved.marker &&
          select.selectPageId !== saved.pageId
        )
          select.selectPage(saved.pageId)
        if (savePartial()) setMessage(t('AI partial restored'))
      }
    } catch {
      setMessage(t('AI partial recovery failed'))
    }
    return () => {
      writeDraft()
      request.current?.abort()
      aiPreview.clear()
    }
  }, [aiPreview])
  const close = (value: boolean) => {
    setShow(value)
    if (!value) {
      request.current?.abort()
      try {
        if (savePartial()) setMessage(t('AI partial saved'))
        aiPreview.clear()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : t('Edit failed'))
      }
      request.current = undefined
      setBusy(false)
    }
  }
  const send = async () => {
    if (!request.current && pending.current?.operations.length) {
      try {
        if (!savePartial()) return
      } catch (error) {
        setMessage(error instanceof Error ? error.message : t('Edit failed'))
        return
      }
    }
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    let timer: ReturnType<typeof setTimeout> | undefined
    const resetTimer = () => {
      clearTimeout(timer)
      timer = setTimeout(() => controller.abort(), 180000)
    }
    resetTimer()
    const sessionId = session.sessionId
    const currentDoc = yDoc.yDoc
    const pageId = select.selectPageId
    setBusy(true)
    setMessage('')
    try {
      const snapshot =
        target === 'current' ? readAiPage(yDoc.doc, pageId) : undefined
      const marker = snapshot && readAiPageMarker(yDoc.doc, pageId)
      aiPreview.begin(target as 'new' | 'current', snapshot)
      pending.current = {
        controller,
        operations: [],
        target: target as 'new' | 'current',
        pageId,
        marker,
        sessionId,
        doc: currentDoc,
      }
      let lastPreview = 0
      let lastDraft = 0
      const result = await requestAiEdit(
        config,
        prompt,
        snapshot,
        controller.signal,
        (operations) => {
          if (request.current !== controller || controller.signal.aborted) return
          if (pending.current?.controller === controller)
            pending.current.operations = operations
          const now = Date.now()
          if (now - lastDraft >= 500) {
            lastDraft = now
            writeDraft()
          }
          if (now - lastPreview >= 100) {
            lastPreview = now
            aiPreview.update([...operations])
          }
        },
        resetTimer,
      )
      if (request.current !== controller) return
      if (controller.signal.aborted)
        throw new Error(t('Network request failed or timed out'))
      if (session.sessionId !== sessionId || yDoc.yDoc !== currentDoc) return
      setMessage(aiEdit.apply(result, target as 'new' | 'current', pageId, marker))
      pending.current = undefined
      clearDraft()
      const appliedPageId = select.selectPageId
      if (target === 'new')
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (
              session.sessionId === sessionId &&
              yDoc.yDoc === currentDoc &&
              select.selectPageId === appliedPageId
            )
              viewportAction.zoomToFitAll()
          }),
        )
    } catch (error) {
      if (request.current === controller) {
        writeDraft()
        try {
          if (savePartial()) setMessage(t('AI partial saved'))
          else setMessage(error instanceof Error ? error.message : t('Edit failed'))
        } catch (saveError) {
          setMessage(
            saveError instanceof Error ? saveError.message : t('Edit failed'),
          )
        }
      }
    } finally {
      clearTimeout(timer)
      if (request.current === controller) {
        if (!pending.current?.operations.length) {
          pending.current = undefined
          aiPreview.clear()
        }
        request.current = undefined
        setBusy(false)
      }
    }
  }
  const update = (key: keyof typeof config, value: string) => {
    const next = { ...config, [key]: value }
    setConfig(next)
    storage.save(next)
  }
  return (
    <>
      <Btn
        size={32}
        variant='ghost'
        aria-label='AI'
        icon={<Lucide icon={Sparkles} size={20} />}
        onClick={() => close(!show)}
      />
      <DragPanel
        id='ai'
        show={show}
        width={400}
        xy={panelPosition}
        title='AI'
        onShow={close}>
        <div className={cls()}>
          <label>
            {t('AI endpoint')}
            <input
              value={config.baseURL}
              onChange={(e) => update('baseURL', e.target.value)}
            />
          </label>
          <label>
            {t('AI model')}
            <input
              value={config.model}
              onChange={(e) => update('model', e.target.value)}
            />
          </label>
          <label>
            API Key
            <input
              type='password'
              value={config.apiKey}
              onChange={(e) => update('apiKey', e.target.value)}
            />
          </label>
          <small>{t('AI key notice')}</small>
          <Segments
            value={target}
            options={[
              { label: t('AI new page'), value: 'new' },
              { label: t('AI current page'), value: 'current' },
            ]}
            onChange={(value) => {
              if (typeof value !== 'string') return
              setTarget(value)
              localStorage.setItem('editor.ai.target', value)
            }}
          />
          <textarea
            rows={5}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t('AI prompt placeholder')}
          />
          <div>
            {examples.map((example) => (
              <button
                className={cls('example')}
                key={example}
                onClick={() => setPrompt(t(example))}>
                {t(example)}
              </button>
            ))}
          </div>
          <Btn variant='solid' disabled={busy} onClick={send}>
            {busy ? t('AI generating') : t('AI send')}
          </Btn>
          {message && <p>{message}</p>}
        </div>
      </DragPanel>
    </>
  )
}

const cls = classes(css`
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  & label {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  & input,
  & textarea {
    width: 100%;
    padding: 7px;
    border: 1px solid var(--gray-border);
    border-radius: 4px;
    background: transparent;
    color: inherit;
  }
  &-example {
    display: block;
    width: 100%;
    text-align: left;
    font-size: 12px;
    line-height: 1.5;
    padding: 5px;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }
  &-example:hover {
    background: var(--gray-bg);
  }
`)
