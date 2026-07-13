import type { MobxUndoState } from '@gitborlando/mobx-undo'
import { Circle, Play, Square } from 'lucide-react'
import { useSearchParams } from 'react-router'
import type { EditorServices } from 'src/editor'
import type { UndoInfo } from 'src/editor/core/undo'
import type { HandleSelectState } from 'src/editor/handle/select'
import { Btn } from 'src/view/component/btn'
import { Lucide } from 'src/view/component/lucide'
import { useEditorServices } from 'src/view/hooks/editor'

type SnapshotState = {
  schema: S.Schema
  undoStack: UndoInfo[]
  undoNext: number
  savedAt: number
}

type DevSnapshot = SnapshotState & { base?: SnapshotState }

type YState = EditorServices['yState']
type Undo = EditorServices['undo']

const STORAGE_KEY_PREFIX = 'sigma:dev-snapshot'

export const EditorHeaderDevSnapshotComp: FC<{}> = observer(({}) => {
  const { yState, undo } = useEditorServices()
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

      const snapshot: DevSnapshot = { ...createSnapshotState(yState, undo), base }

      try {
        localStorage.setItem(storageKey, JSON.stringify(snapshot))
        setHasSnapshot(true)
      } catch (error) {
        console.warn('Save dev snapshot failed', error)
      }
    },
    [storageKey, undo, yState],
  )

  const restoreSnapshot = useCallback(() => {
    const snapshot = readSnapshot(storageKey)
    if (!snapshot) return false

    if (snapshot.base) {
      restoreReplayableSnapshot(yState, undo, snapshot)
    } else {
      restoreFinalSnapshot(yState, undo, snapshot)
    }
    return true
  }, [storageKey, undo, yState])

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
    const base = createSnapshotState(yState, undo)
    baseSnapshotRef.current = base
    saveSnapshot(base)
    setAppliedRecord(false)
    setRecording(true)
  }, [saveSnapshot, undo, yState])

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
    const unSub = yState.flushPatch$.hook(scheduleSave)
    const disposeHistoryReaction = reaction(
      () => [undo.next, undo.stack.length],
      scheduleSave,
    )

    return () => {
      window.clearTimeout(timer)
      saveSnapshot()
      unSub()
      disposeHistoryReaction()
    }
  }, [recording, saveSnapshot, undo, yState])

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

function createSnapshotState(yState: YState, undo: Undo): SnapshotState {
  return {
    schema: toPlain(yState.schema),
    undoStack: toPlain(undo.stack),
    undoNext: undo.next,
    savedAt: Date.now(),
  }
}

function restoreFinalSnapshot(yState: YState, undo: Undo, snapshot: SnapshotState) {
  replaceSchema(yState, snapshot.schema)
  restoreUndo(yState, undo, snapshot)
}

function restoreReplayableSnapshot(
  yState: YState,
  undo: Undo,
  snapshot: DevSnapshot,
) {
  const base = snapshot.base
  if (!base) return restoreFinalSnapshot(yState, undo, snapshot)

  replaceSchema(yState, base.schema)
  if (!resetUndo(yState, undo)) return

  replayHistoryFromBase(yState, undo, snapshot, base)
}

function replaceSchema(yState: YState, schema: S.Schema) {
  const currentKeys = Object.keys(yState.state)
  const nextKeys = Object.keys(schema)

  yState.transact(() => {
    currentKeys.forEach((key) => {
      if (!(key in schema)) yState.delete<any>([key])
    })
    nextKeys.forEach((key) => yState.set<any>([key], schema[key]))
  })
}

function restoreUndo(yState: YState, undo: Undo, snapshot: SnapshotState) {
  if (!resetUndo(yState, undo)) return

  undo.restoreHistory(toPlain(snapshot.undoStack || []), snapshot.undoNext || 0)
}

function resetUndo(yState: YState, undo: Undo) {
  undo.setup()
  return true
}

function replayHistoryFromBase(
  yState: YState,
  undo: Undo,
  snapshot: DevSnapshot,
  base: SnapshotState,
) {
  const stack = snapshot.undoStack || []
  const start = Math.min(base.undoNext || 0, stack.length)
  const end = Math.min(snapshot.undoNext || 0, stack.length)

  stack.slice(start, end).forEach((info) => replayHistoryInfo(yState, undo, info))

  undo.restoreHistory(toPlain(stack), end)
}

function replayHistoryInfo(yState: YState, undo: Undo, info: UndoInfo) {
  if (info.type === 'client') {
    applyReplayLocalState(yState, undo, info)
    undo.track(info.type, info.description)
    return
  }

  yState.transact(() => applyStatePatches(yState, info.statePatches))
  if (info.type === 'all') applyReplayLocalState(yState, undo, info)

  undo.track(info.type, info.description)
}

function applyReplayLocalState(yState: YState, undo: Undo, info: UndoInfo) {
  const { mobxUndo } = undo
  const localState = info.clientState
  if (localState) {
    mobxUndo.applyState(normalizeLocalState(yState, localState))
    return
  }

  if (mobxUndo.has('select')) {
    const select = mobxUndo.get<HandleSelectState>('select')
    mobxUndo.applyState({ select: normalizeSelectState(yState, select) })
  }
}

function normalizeLocalState(yState: YState, state: MobxUndoState) {
  if (!state.select) return state

  return {
    ...state,
    select: normalizeSelectState(yState, state.select as HandleSelectState),
  }
}

function normalizeSelectState(yState: YState, state: HandleSelectState) {
  return {
    ...state,
    selectIdMap: Object.fromEntries(
      Object.entries(state.selectIdMap || {}).filter(([id]) => yState.state[id]),
    ),
    selectPageId: getValidPageId(yState, state.selectPageId),
  }
}

function getValidPageId(yState: YState, pageId: string) {
  if (pageId && yState.state[pageId]) return pageId
  return yState.state.meta?.pageIds[0] || ''
}

function applyStatePatches(yState: YState, patches: UndoInfo['statePatches']) {
  patches?.forEach((patch) => {
    const plainYState = yState as any
    const keys = patch.keys as [string, ...Array<string | number>]
    switch (patch.type) {
      case 'add':
        if (shouldInsertPatch(yState, keys))
          plainYState.insert(keys, toPlain(patch.value))
        else plainYState.set(keys, toPlain(patch.value))
        return
      case 'replace':
        plainYState.set(keys, toPlain(patch.value))
        return
      case 'remove':
        plainYState.delete(keys)
    }
  })
}

function shouldInsertPatch(yState: YState, keys: readonly (string | number)[]) {
  const lastIndex = Number(keys[keys.length - 1])
  if (Number.isNaN(lastIndex)) return false

  return Array.isArray(getSchemaValue(yState, keys.slice(0, -1)))
}

function getSchemaValue(yState: YState, keys: readonly (string | number)[]) {
  let current: any = yState.state
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
