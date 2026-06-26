import { MobxUndoState } from '@gitborlando/mobx-undo'
import { Circle, Play, Square } from 'lucide-react'
import { useSearchParams } from 'react-router'
import type { Editor } from 'src/editor'
import { MobxUndo, UndoInfo } from 'src/editor/core/undo'
import { Btn } from 'src/view/component/btn'
import { Lucide } from 'src/view/component/lucide'
import { useEditor } from 'src/view/hooks/editor'

type SnapshotState = {
  schema: S.Schema
  undoStack: UndoInfo[]
  undoNext: number
  savedAt: number
}

type DevSnapshot = SnapshotState & {
  base?: SnapshotState
}

const STORAGE_KEY_PREFIX = 'sigma:dev-snapshot'

export const EditorHeaderDevSnapshotComp: FC<{}> = observer(({}) => {
  const editor = useEditor()
  const { fileId } = useParams<{ fileId: string }>()
  const [searchParams] = useSearchParams()
  const applyRecord = searchParams.get('applyRecord') === 'true'
  const storageKey = getStorageKey(fileId)
  const baseSnapshotRef = useRef<SnapshotState>()
  const appliedRecordKeyRef = useRef<string>()
  const [recording, setRecording] = useState(false)
  const [appliedRecord, setAppliedRecord] = useState(false)
  const [hasSnapshot, setHasSnapshot] = useState(() => hasStoredSnapshot(storageKey))

  useEffect(() => {
    setRecording(false)
    setAppliedRecord(false)
    baseSnapshotRef.current = undefined
    setHasSnapshot(hasStoredSnapshot(storageKey))
  }, [storageKey])

  const saveSnapshot = useCallback(
    (base = baseSnapshotRef.current) => {
      if (!storageKey) return

      const snapshot: DevSnapshot = { ...createSnapshotState(editor), base }

      try {
        localStorage.setItem(storageKey, JSON.stringify(snapshot))
        setHasSnapshot(true)
      } catch (error) {
        console.warn('Save dev snapshot failed', error)
      }
    },
    [editor, storageKey],
  )

  const restoreSnapshot = useCallback(() => {
    const snapshot = readSnapshot(storageKey)
    if (!snapshot) return false

    if (snapshot.base) {
      restoreReplayableSnapshot(editor, snapshot)
    } else {
      restoreFinalSnapshot(editor, snapshot)
    }
    return true
  }, [editor, storageKey])

  useEffect(() => {
    if (!applyRecord || !storageKey) return
    if (appliedRecordKeyRef.current === storageKey) return

    appliedRecordKeyRef.current = storageKey
    if (restoreSnapshot()) setAppliedRecord(true)
  }, [applyRecord, restoreSnapshot, storageKey])

  const deleteSnapshot = useCallback(() => {
    if (!storageKey) return

    localStorage.removeItem(storageKey)
    setHasSnapshot(false)
    setRecording(false)
    setAppliedRecord(false)
  }, [storageKey])

  const startRecording = useCallback(() => {
    const base = createSnapshotState(editor)
    baseSnapshotRef.current = base
    saveSnapshot(base)
    setAppliedRecord(false)
    setRecording(true)
  }, [editor, saveSnapshot])

  const stopRecording = useCallback(() => {
    saveSnapshot()
    setRecording(false)
  }, [saveSnapshot])

  useEffect(() => {
    if (!recording) return

    let timer: number | undefined
    const scheduleSave = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(saveSnapshot, 300)
    }
    const unSub = editor.yState.flushPatch$.hook(scheduleSave)
    const disposeHistoryReaction = reaction(
      () => [editor.undo.next, editor.undo.stack.length],
      scheduleSave,
    )

    return () => {
      window.clearTimeout(timer)
      saveSnapshot()
      unSub()
      disposeHistoryReaction()
    }
  }, [editor, recording, saveSnapshot])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey || !e.shiftKey) return

      const key = e.key.toLowerCase()
      if (key === 'r') {
        e.preventDefault()
        recording ? stopRecording() : startRecording()
      }
      if (key === 'p') {
        e.preventDefault()
        if (!appliedRecord && restoreSnapshot()) setAppliedRecord(true)
      }
      if (key === 'd') {
        e.preventDefault()
        deleteSnapshot()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    appliedRecord,
    deleteSnapshot,
    recording,
    restoreSnapshot,
    startRecording,
    stopRecording,
  ])

  if (!isDEV) return null

  const icon = appliedRecord ? Square : recording || !hasSnapshot ? Circle : Play
  const active = recording
  const title = getButtonTitle(recording, hasSnapshot, appliedRecord)

  return (
    <Btn
      size={32}
      active={active}
      className={cx(recording && cls('recording'), appliedRecord && cls('applied'))}
      title={title}
      icon={<Lucide icon={icon} size={18} />}
      onContextMenu={(e) => {
        e.preventDefault()
        deleteSnapshot()
      }}
      onClick={(e) => {
        if (appliedRecord) return
        if (recording) return stopRecording()
        if (e.altKey) return startRecording()
        if (hasSnapshot && restoreSnapshot()) return setAppliedRecord(true)
        startRecording()
      }}
    />
  )
})

function getStorageKey(fileId?: string) {
  if (!fileId) return ''
  return `${STORAGE_KEY_PREFIX}:${fileId}`
}

function hasStoredSnapshot(storageKey: string) {
  return Boolean(storageKey && localStorage.getItem(storageKey))
}

function readSnapshot(storageKey: string) {
  if (!storageKey) return

  const text = localStorage.getItem(storageKey)
  if (!text) return

  try {
    return JSON.parse(text) as DevSnapshot
  } catch {
    localStorage.removeItem(storageKey)
  }
}

function createSnapshotState(editor: Editor): SnapshotState {
  return {
    schema: toPlain(editor.yState.schema),
    undoStack: toPlain(editor.undo.stack),
    undoNext: editor.undo.next,
    savedAt: Date.now(),
  }
}

function restoreFinalSnapshot(editor: Editor, snapshot: SnapshotState) {
  replaceSchema(editor, snapshot.schema)
  restoreUndo(editor, snapshot)
}

function restoreReplayableSnapshot(editor: Editor, snapshot: DevSnapshot) {
  const base = snapshot.base
  if (!base) return restoreFinalSnapshot(editor, snapshot)

  replaceSchema(editor, base.schema)
  if (!resetUndo(editor)) return

  MobxUndo.rebase()
  replayHistoryFromBase(editor, snapshot, base)
}

function replaceSchema(editor: Editor, schema: S.Schema) {
  const currentKeys = Object.keys(editor.yState.state)
  const nextKeys = Object.keys(schema)

  editor.yState.transact(() => {
    currentKeys.forEach((key) => {
      if (!(key in schema)) editor.yState.delete<any>([key])
    })
    nextKeys.forEach((key) => editor.yState.set<any>([key], schema[key]))
  })
}

function restoreUndo(editor: Editor, snapshot: SnapshotState) {
  if (!resetUndo(editor)) return

  editor.undo.restoreHistory(
    toPlain(snapshot.undoStack || []),
    snapshot.undoNext || 0,
  )
}

function resetUndo(editor: Editor) {
  const ySchema = editor.yState.doc?.getMap<S.Schema>('schema')
  if (!ySchema) return false

  editor.undo.initUndo({
    stateMap: ySchema,
    getPatches: editor.yState.getPatches,
  })
  return true
}

function replayHistoryFromBase(
  editor: Editor,
  snapshot: DevSnapshot,
  base: SnapshotState,
) {
  const stack = snapshot.undoStack || []
  const start = Math.min(base.undoNext || 0, stack.length)
  const end = Math.min(snapshot.undoNext || 0, stack.length)

  stack.slice(start, end).forEach((info) => replayHistoryInfo(editor, info))

  editor.undo.restoreHistory(toPlain(stack), end)
}

function replayHistoryInfo(editor: Editor, info: UndoInfo) {
  if (info.type === 'client') {
    applyReplayLocalState(editor, info)
    editor.undo.track(info.type, info.description)
    return
  }

  editor.yState.transact(() => applyStatePatches(editor, info.statePatches))
  if (info.type === 'all') applyReplayLocalState(editor, info)

  editor.undo.track(info.type, info.description)
}

function applyReplayLocalState(editor: Editor, info: UndoInfo) {
  const localState = info.clientState
  if (localState) {
    MobxUndo.applyState(normalizeLocalState(editor, localState))
    return
  }

  if (MobxUndo.has('select')) {
    const select = MobxUndo.get<HandleSelectState>('select')
    MobxUndo.applyState({ select: normalizeSelectState(editor, select) })
  }
}

type HandleSelectState = {
  selectIdMap: Record<string, boolean>
  selectPageId: string
}

function normalizeLocalState(editor: Editor, state: MobxUndoState) {
  if (!state.select) return state

  return {
    ...state,
    select: normalizeSelectState(editor, state.select as HandleSelectState),
  }
}

function normalizeSelectState(editor: Editor, state: HandleSelectState) {
  return {
    ...state,
    selectIdMap: Object.fromEntries(
      Object.entries(state.selectIdMap || {}).filter(
        ([id]) => editor.yState.state[id],
      ),
    ),
    selectPageId: getValidPageId(editor, state.selectPageId),
  }
}

function getValidPageId(editor: Editor, pageId: string) {
  if (pageId && editor.yState.state[pageId]) return pageId
  return editor.yState.state.meta?.pageIds[0] || ''
}

function applyStatePatches(editor: Editor, patches: UndoInfo['statePatches']) {
  patches?.forEach((patch) => {
    const yState = editor.yState as any
    const keys = patch.keys as [string, ...Array<string | number>]
    switch (patch.type) {
      case 'add':
        if (shouldInsertPatch(editor, keys))
          yState.insert(keys, toPlain(patch.value))
        else yState.set(keys, toPlain(patch.value))
        return
      case 'replace':
        yState.set(keys, toPlain(patch.value))
        return
      case 'remove':
        yState.delete(keys)
    }
  })
}

function shouldInsertPatch(editor: Editor, keys: readonly (string | number)[]) {
  const lastIndex = Number(keys[keys.length - 1])
  if (Number.isNaN(lastIndex)) return false

  return Array.isArray(getSchemaValue(editor, keys.slice(0, -1)))
}

function getSchemaValue(editor: Editor, keys: readonly (string | number)[]) {
  let current: any = editor.yState.state
  keys.forEach((key) => {
    current = current?.[key]
  })
  return current
}

function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function getButtonTitle(
  recording: boolean,
  hasSnapshot: boolean,
  appliedRecord: boolean,
) {
  if (appliedRecord) return '已应用调试快照，右键删除'
  if (recording) return '停止录制调试快照 Alt+Shift+R'
  if (hasSnapshot) return '恢复调试快照 Alt+Shift+P，Alt+点击重新录制，右键删除'
  return '开始录制调试快照 Alt+Shift+R'
}

const cls = classes(css`
  &-applied {
    opacity: 0.4;
    cursor: not-allowed;
  }
  &-recording {
    color: white !important;
    background-color: #e5484d !important;
  }
`)
