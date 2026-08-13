import type { MobxUndoState } from '@gitborlando/mobx-undo'
import { Circle, Play, Square } from 'lucide-react'
import { useSearchParams } from 'react-router'
import type { EditorServices } from 'src/editor'
import type { UndoInfo } from 'src/editor/action/undo'
import { type IMatrix, Matrix } from 'src/editor/geometry'
import type { SelectState } from 'src/editor/select'
import { GRAPHS } from 'src/global/constant'
import { Btn } from 'src/view/component/btn'
import { Lucide } from 'src/view/component/lucide'
import { useEditorServices } from 'src/view/hooks/use-editor'

type SnapshotState = {
  doc: S.Doc
  undoStack: UndoInfo[]
  undoNext: number
  savedAt: number
  sceneMatrix: IMatrix
}

type DevSnapshot = SnapshotState & { base?: SnapshotState }

type YDoc = EditorServices['yDoc']
type Undo = EditorServices['undo']
type StageViewport = EditorServices['stageViewport']

const STORAGE_KEY_PREFIX = 'sigma:dev-snapshot'

export const EditorHeaderDevSnapshotComp: FC<{}> = observer(({}) => {
  const { yDoc, undo, stageViewport } = useEditorServices()
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

      const snapshot: DevSnapshot = {
        ...createSnapshotState(yDoc, undo, stageViewport),
        base,
      }

      try {
        localStorage.setItem(storageKey, JSON.stringify(snapshot))
        setHasSnapshot(true)
      } catch (error) {
        console.warn('Save dev snapshot failed', error)
      }
    },
    [stageViewport, storageKey, undo, yDoc],
  )

  const restoreSnapshot = useCallback(() => {
    const snapshot = readSnapshot(storageKey)
    if (!snapshot) return false

    if (snapshot.base) {
      restoreReplayableSnapshot(yDoc, undo, stageViewport, snapshot)
    } else {
      restoreFinalSnapshot(yDoc, undo, stageViewport, snapshot)
    }
    return true
  }, [stageViewport, storageKey, undo, yDoc])

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
    const base = createSnapshotState(yDoc, undo, stageViewport)
    baseSnapshotRef.current = base
    saveSnapshot(base)
    setAppliedRecord(false)
    setRecording(true)
  }, [saveSnapshot, stageViewport, undo, yDoc])

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
    const unSub = yDoc.flushPatch$.hook(scheduleSave)
    const disposeHistoryReaction = reaction(
      () => [undo.next, undo.stack.length],
      scheduleSave,
    )
    const disposeSceneMatrixReaction = reaction(
      () => stageViewport.sceneMatrix,
      scheduleSave,
    )

    return () => {
      window.clearTimeout(timer)
      saveSnapshot()
      unSub()
      disposeHistoryReaction()
      disposeSceneMatrixReaction()
    }
  }, [recording, saveSnapshot, stageViewport, undo, yDoc])

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

function createSnapshotState(
  yDoc: YDoc,
  undo: Undo,
  stageViewport: StageViewport,
): SnapshotState {
  return {
    doc: toPlain(yDoc.doc),
    undoStack: toPlain(undo.stack),
    undoNext: undo.next,
    savedAt: Date.now(),
    sceneMatrix: Matrix.plain(stageViewport.sceneMatrix),
  }
}

function restoreFinalSnapshot(
  yDoc: YDoc,
  undo: Undo,
  stageViewport: StageViewport,
  snapshot: SnapshotState,
) {
  replaceDoc(yDoc, snapshot.doc)
  restoreUndo(yDoc, undo, snapshot)
  restoreSceneMatrix(stageViewport, snapshot)
}

function restoreReplayableSnapshot(
  yDoc: YDoc,
  undo: Undo,
  stageViewport: StageViewport,
  snapshot: DevSnapshot,
) {
  const base = snapshot.base
  if (!base) return restoreFinalSnapshot(yDoc, undo, stageViewport, snapshot)

  replaceDoc(yDoc, base.doc)
  if (!resetUndo(yDoc, undo)) return

  replayHistoryFromBase(yDoc, undo, snapshot, base)
  restoreSceneMatrix(stageViewport, snapshot)
}

function restoreSceneMatrix(stageViewport: StageViewport, snapshot: SnapshotState) {
  if (!snapshot.sceneMatrix) return
  stageViewport.sceneMatrix = Matrix.of(snapshot.sceneMatrix)
}

function replaceDoc(yDoc: YDoc, doc: S.Doc) {
  const currentKeys = Object.keys(yDoc.doc.graphs)
  const nextKeys = Object.keys(doc.graphs)

  yDoc.transact(() => {
    currentKeys.forEach((key) => {
      if (!(key in doc)) yDoc.delete<any>([GRAPHS, key])
    })
    nextKeys.forEach((key) => yDoc.set<any>([GRAPHS, key], doc.graphs[key]))
  })
}

function restoreUndo(yDoc: YDoc, undo: Undo, snapshot: SnapshotState) {
  if (!resetUndo(yDoc, undo)) return

  undo.restoreHistory(toPlain(snapshot.undoStack || []), snapshot.undoNext || 0)
}

function resetUndo(yDoc: YDoc, undo: Undo) {
  undo.setup()
  return true
}

function replayHistoryFromBase(
  yDoc: YDoc,
  undo: Undo,
  snapshot: DevSnapshot,
  base: SnapshotState,
) {
  const stack = snapshot.undoStack || []
  const start = Math.min(base.undoNext || 0, stack.length)
  const end = Math.min(snapshot.undoNext || 0, stack.length)

  stack.slice(start, end).forEach((info) => replayHistoryInfo(yDoc, undo, info))

  undo.restoreHistory(toPlain(stack), end)
}

function replayHistoryInfo(yDoc: YDoc, undo: Undo, info: UndoInfo) {
  if (info.type === 'client') {
    applyReplayLocalState(yDoc, undo, info)
    undo.track(info.type, info.description)
    return
  }

  yDoc.transact(() => applyDocPatches(yDoc, info.statePatches))
  if (info.type === 'all') applyReplayLocalState(yDoc, undo, info)

  undo.track(info.type, info.description)
}

function applyReplayLocalState(yDoc: YDoc, undo: Undo, info: UndoInfo) {
  const { mobxUndo } = undo
  const localState = info.clientState
  if (localState) {
    mobxUndo.applyDoc(normalizeLocalState(yDoc, localState))
    return
  }

  if (mobxUndo.has('select')) {
    const select = mobxUndo.get<SelectState>('select')
    mobxUndo.applyDoc({ select: normalizeSelectState(yDoc, select) })
  }
}

function normalizeLocalState(yDoc: YDoc, state: MobxUndoState) {
  if (!state.select) return state

  return {
    ...state,
    select: normalizeSelectState(yDoc, state.select as SelectState),
  }
}

function normalizeSelectState(yDoc: YDoc, state: SelectState) {
  return {
    ...state,
    selection: Object.fromEntries(
      Object.entries(state.selection || {}).filter(([id]) => yDoc.doc.graphs[id]),
    ),
    selectPageId: getValidPageId(yDoc, state.selectPageId),
  }
}

function getValidPageId(yDoc: YDoc, pageId: string) {
  if (pageId && yDoc.doc.graphs[pageId]) return pageId
  return yDoc.doc.meta?.pageIds[0] || ''
}

function applyDocPatches(yDoc: YDoc, patches: UndoInfo['statePatches']) {
  patches?.forEach((patch) => {
    const plainYDoc = yDoc as any
    const keys = patch.keys as [string, ...Array<string | number>]
    switch (patch.type) {
      case 'add':
        if (shouldInsertPatch(yDoc, keys))
          plainYDoc.insert(keys, toPlain(patch.value))
        else plainYDoc.set(keys, toPlain(patch.value))
        return
      case 'replace':
        plainYDoc.set(keys, toPlain(patch.value))
        return
      case 'remove':
        plainYDoc.delete(keys)
    }
  })
}

function shouldInsertPatch(yDoc: YDoc, keys: readonly (string | number)[]) {
  const lastIndex = Number(keys[keys.length - 1])
  if (Number.isNaN(lastIndex)) return false

  return Array.isArray(getDocValue(yDoc, keys.slice(0, -1)))
}

function getDocValue(yDoc: YDoc, keys: readonly (string | number)[]) {
  let current: any = yDoc.doc
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
