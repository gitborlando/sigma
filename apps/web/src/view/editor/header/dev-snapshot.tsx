import { Circle, Play } from 'lucide-react'
import { StageViewport } from 'src/editor/stage/viewport'
import type { YUndoInfo } from 'src/editor/y-state/y-undo'
import { Btn } from 'src/view/component/btn'

type SnapshotState = {
  schema: S.Schema
  selectPageId: string
  selectIdMap: Record<string, boolean>
  sceneMatrix: IMatrix
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
  const storageKey = getStorageKey(fileId)
  const baseSnapshotRef = useRef<SnapshotState>()
  const [recording, setRecording] = useState(false)
  const [hasSnapshot, setHasSnapshot] = useState(() => hasStoredSnapshot(storageKey))

  useEffect(() => {
    setRecording(false)
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
    if (!snapshot) return

    if (snapshot.base) {
      restoreReplayableSnapshot(snapshot)
    } else {
      restoreFinalSnapshot(snapshot)
    }
  }, [storageKey])

  const deleteSnapshot = useCallback(() => {
    if (!storageKey) return

    localStorage.removeItem(storageKey)
    setHasSnapshot(false)
    setRecording(false)
  }, [storageKey])

  const startRecording = useCallback(() => {
    const base = createSnapshotState()
    baseSnapshotRef.current = base
    saveSnapshot(base)
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
        restoreSnapshot()
      }
      if (key === 'd') {
        e.preventDefault()
        deleteSnapshot()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [deleteSnapshot, recording, restoreSnapshot, startRecording, stopRecording])

  if (!isDEV) return null

  const icon = recording || !hasSnapshot ? Circle : Play
  const active = recording
  const title = getButtonTitle(recording, hasSnapshot)

  return (
    <Btn
      size={32}
      active={active}
      className={recording ? cls('recording') : undefined}
      title={title}
      icon={<Lucide icon={icon} size={18} />}
      onContextMenu={(e) => {
        e.preventDefault()
        deleteSnapshot()
      }}
      onClick={(e) => {
        if (recording) return stopRecording()
        if (e.altKey) return startRecording()
        if (hasSnapshot) return restoreSnapshot()
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
    selectPageId: YClients.client.selectPageId,
    selectIdMap: toPlain(YClients.client.selectIdMap),
    sceneMatrix: Matrix.plain(StageViewport.sceneMatrix),
    undoStack: toPlain(YUndo.stack),
    undoNext: YUndo.next,
    savedAt: Date.now(),
  }
}

function restoreFinalSnapshot(snapshot: SnapshotState) {
  replaceSchema(snapshot.schema)
  restoreClient(snapshot)
  StageViewport.sceneMatrix = Matrix.of(snapshot.sceneMatrix)
  restoreUndo(snapshot)
}

function restoreReplayableSnapshot(snapshot: DevSnapshot) {
  const base = snapshot.base
  if (!base) return restoreFinalSnapshot(snapshot)

  replaceSchema(base.schema)
  restoreClient(base)
  StageViewport.sceneMatrix = Matrix.of(base.sceneMatrix)
  resetUndo()

  replayHistoryFromBase(snapshot, base)
  restoreClient(snapshot)
  StageViewport.sceneMatrix = Matrix.of(snapshot.sceneMatrix)
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

function restoreClient(snapshot: DevSnapshot) {
  const selectPageId = snapshot.schema[snapshot.selectPageId]
    ? snapshot.selectPageId
    : snapshot.schema.meta.pageIds[0]
  const selectIdMap = Object.fromEntries(
    Object.entries(snapshot.selectIdMap).filter(([id]) => snapshot.schema[id]),
  )

  runInAction(() => {
    YClients.client.selectPageId = selectPageId
    YClients.client.selectIdMap = selectIdMap
  })
  YClients.afterSelect.dispatch()
}

function restoreUndo(snapshot: SnapshotState) {
  const ySchema = YState.doc?.getMap<S.Schema>('schema')
  if (!ySchema) return

  YUndo.initStateUndo(ySchema)
  YUndo.initClientUndo()
  runInAction(() => {
    YUndo.stack = toPlain(snapshot.undoStack || [])
    YUndo.next = Math.min(snapshot.undoNext || 0, YUndo.stack.length)
  })
}

function resetUndo() {
  const ySchema = YState.doc?.getMap<S.Schema>('schema')
  if (!ySchema) return

  YUndo.initStateUndo(ySchema)
  YUndo.initClientUndo()
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
    applyClientState(info.clientState)
    YUndo.track({ type: info.type, description: info.description })
    return
  }

  YState.transact(() => applyStatePatches(info.statePatches))
  if (info.type === 'all') applyClientState(info.clientState)

  YUndo.track({ type: info.type, description: info.description })
}

function applyClientState(clientState: YUndoInfo['clientState']) {
  if (!clientState) return

  runInAction(() => {
    YClients.client.selectPageId = clientState.selectPageId
    YClients.client.selectIdMap = toPlain(clientState.selectIds)
  })
  YClients.afterSelect.dispatch()
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

function getButtonTitle(recording: boolean, hasSnapshot: boolean) {
  if (recording) return '停止录制调试快照 Alt+Shift+R'
  if (hasSnapshot) return '恢复调试快照 Alt+Shift+P，Alt+点击重新录制，右键删除'
  return '开始录制调试快照 Alt+Shift+R'
}

const cls = classes(css`
  &-recording {
    color: white !important;
    background-color: #e5484d !important;
  }
`)
