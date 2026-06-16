import { Circle, Play, Square } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { ClientUndo, type ClientUndoState } from 'src/editor/editor/client-undo'
import type { YUndoInfo } from 'src/editor/y-state/y-undo'
import { Btn } from 'src/view/component/btn'

type SnapshotState = {
  schema: S.Schema
  undoStack: YUndoInfo[]
  undoNext: number
  savedAt: number
}

type DevSnapshot = SnapshotState & {
  base?: SnapshotState
}

const STORAGE_KEY_PREFIX = 'sigma:dev-snapshot'

export const EditorHeaderDevSnapshotComp: FC<{}> = observer(({}) => {
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

      const snapshot: DevSnapshot = { ...createSnapshotState(), base }

      try {
        localStorage.setItem(storageKey, JSON.stringify(snapshot))
        setHasSnapshot(true)
      } catch (error) {
        console.warn('Save dev snapshot failed', error)
      }
    },
    [storageKey],
  )

  const restoreSnapshot = useCallback(() => {
    const snapshot = readSnapshot(storageKey)
    if (!snapshot) return false

    if (snapshot.base) {
      restoreReplayableSnapshot(snapshot)
    } else {
      restoreFinalSnapshot(snapshot)
    }
    return true
  }, [storageKey])

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
    const base = createSnapshotState()
    baseSnapshotRef.current = base
    saveSnapshot(base)
    setAppliedRecord(false)
    setRecording(true)
  }, [saveSnapshot])

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
    const unSub = YState.flushPatch$.hook(scheduleSave)
    const disposeHistoryReaction = reaction(
      () => [YUndo.next, YUndo.stack.length],
      scheduleSave,
    )

    return () => {
      window.clearTimeout(timer)
      saveSnapshot()
      unSub()
      disposeHistoryReaction()
    }
  }, [recording, saveSnapshot])

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

function createSnapshotState(): SnapshotState {
  return {
    schema: toPlain(YState.schema),
    undoStack: toPlain(YUndo.stack),
    undoNext: YUndo.next,
    savedAt: Date.now(),
  }
}

function restoreFinalSnapshot(snapshot: SnapshotState) {
  replaceSchema(snapshot.schema)
  restoreUndo(snapshot)
}

function restoreReplayableSnapshot(snapshot: DevSnapshot) {
  const base = snapshot.base
  if (!base) return restoreFinalSnapshot(snapshot)

  replaceSchema(base.schema)
  if (!resetUndo()) return

  ClientUndo.rebase()
  replayHistoryFromBase(snapshot, base)
}

function replaceSchema(schema: S.Schema) {
  const currentKeys = Object.keys(YState.state)
  const nextKeys = Object.keys(schema)

  YState.transact(() => {
    currentKeys.forEach((key) => {
      if (!(key in schema)) YState.delete(key)
    })
    nextKeys.forEach((key) => YState.set(key, schema[key]))
  })
}

function restoreUndo(snapshot: SnapshotState) {
  if (!resetUndo()) return

  runInAction(() => {
    YUndo.stack = toPlain(snapshot.undoStack || [])
    YUndo.next = Math.min(snapshot.undoNext || 0, YUndo.stack.length)
  })
}

function resetUndo() {
  const ySchema = YState.doc?.getMap<S.Schema>('schema')
  if (!ySchema) return false

  YUndo.initStateUndo(ySchema)
  return true
}

function replayHistoryFromBase(snapshot: DevSnapshot, base: SnapshotState) {
  const stack = snapshot.undoStack || []
  const start = Math.min(base.undoNext || 0, stack.length)
  const end = Math.min(snapshot.undoNext || 0, stack.length)

  stack.slice(start, end).forEach(replayHistoryInfo)

  runInAction(() => {
    YUndo.stack = toPlain(stack)
    YUndo.next = end
  })
}

function replayHistoryInfo(info: YUndoInfo) {
  if (info.type === 'client') {
    applyReplayLocalState(info)
    YUndo.track(info.type, info.description)
    return
  }

  YState.transact(() => applyStatePatches(info.statePatches))
  if (info.type === 'all') applyReplayLocalState(info)

  YUndo.track(info.type, info.description)
}

function applyReplayLocalState(info: YUndoInfo) {
  const localState = info.clientState
  if (localState) {
    ClientUndo.applyState(normalizeLocalState(localState))
    return
  }

  if (ClientUndo.has('select')) {
    const select = ClientUndo.get<HandleSelectState>('select')
    ClientUndo.applyState({ select: normalizeSelectState(select) })
  }
}

type HandleSelectState = {
  selectIdMap: Record<string, boolean>
  selectPageId: string
}

function normalizeLocalState(state: ClientUndoState) {
  if (!state.select) return state

  return {
    ...state,
    select: normalizeSelectState(state.select as HandleSelectState),
  }
}

function normalizeSelectState(state: HandleSelectState) {
  return {
    ...state,
    selectIdMap: Object.fromEntries(
      Object.entries(state.selectIdMap || {}).filter(([id]) => YState.state[id]),
    ),
    selectPageId: getValidPageId(state.selectPageId),
  }
}

function getValidPageId(pageId: string) {
  if (pageId && YState.state[pageId]) return pageId
  return YState.state.meta?.pageIds[0] || ''
}

function applyStatePatches(patches: YUndoInfo['statePatches']) {
  patches?.forEach((patch) => {
    const keyPath = patch.keys.join('.')

    switch (patch.type) {
      case 'add':
        if (shouldInsertPatch(patch.keys))
          YState.insert(keyPath, toPlain(patch.value))
        else YState.set(keyPath, toPlain(patch.value))
        return
      case 'replace':
        YState.set(keyPath, toPlain(patch.value))
        return
      case 'remove':
        YState.delete(keyPath)
    }
  })
}

function shouldInsertPatch(keys: (string | number)[]) {
  const lastIndex = Number(keys[keys.length - 1])
  if (Number.isNaN(lastIndex)) return false

  return Array.isArray(getSchemaValue(keys.slice(0, -1)))
}

function getSchemaValue(keys: (string | number)[]) {
  let current: any = YState.state
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
