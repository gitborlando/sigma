import { jsonParse } from '@gitborlando/utils'
import JSZip from 'jszip'
import { EditorCommand } from 'src/editor/editor/command'
import { mock } from 'src/editor/editor/mock/transfrom'
import { EditorSetting } from 'src/editor/editor/setting'
import { HandleNode } from 'src/editor/handle/node'
import { HandlePage } from 'src/editor/handle/page'
import { StageScene } from 'src/editor/render/scene'
import { StageSurface } from 'src/editor/render/surface'
import { StageCursor } from 'src/editor/stage/cursor'
import { StageToolGrid } from 'src/editor/stage/tools/grid'
import { FileService } from 'src/global/service/file'
import { Disposer } from 'src/utils/disposer'
import { OperateAlign } from '../operate/align'
import { OperateFill } from '../operate/fill'
import { OperateShadow } from '../operate/shadow'
import { OperateStroke } from '../operate/stroke'
import { OperateText } from '../operate/text'
import { StageDrop } from '../stage/drop'
import { StageInteract } from '../stage/interact/interact'
import { StageViewport } from '../stage/viewport'

const jsZip = new JSZip()

export class EditorService {
  inited = Signal.create(false)
  private disposer = new Disposer()

  private subscribe() {
    return Disposer.collect(
      HandleNode.subscribe(),
      HandlePage.subscribe(),

      StageSurface.subscribe(),
      StageScene.subscribe(),
      StageViewport.subscribe(),
      StageToolGrid.subscribe(),
      StageInteract.subscribe(),
      StageCursor.subscribe(),
    )
  }

  private initHooks() {
    EditorSetting.init()
    EditorCommand.init()

    OperateAlign.initHook()
    OperateFill.init()
    OperateStroke.initHook()
    OperateShadow.initHook()
    OperateText.initHook()

    StageDrop.initHook()
  }

  dispose() {
    Editor.inited.value = false
    YState.inited$.value = false

    this.disposer.dispose()
  }

  initSchema = async (fileId: string, onProgress?: (progress: number) => void) => {
    let schema: V1.Schema | undefined

    if (fileId === 'mock') {
      let mockSchema = mock()
      if (mockSchema) schema = mockSchema
    } else {
      const fileMeta = await FileService.getFileMeta(fileId)
      if (fileMeta) {
        const zipBuffer = await FileService.loadFile(fileMeta.url, onProgress)
        const zipFiles = await jsZip.loadAsync(zipBuffer)
        const fileText = await zipFiles
          .file(`${decodeURIComponent(fileMeta.name)}.json`)
          ?.async('text')
        schema = jsonParse(fileText) as V1.Schema
      }
    }

    if (schema) {
      YState.initSchema(fileId, schema)
      this.disposer.add(YClients.init())
      // this.disposer.add(YSync.init(fileId, YState.doc))
      StageViewport.init()
    }
  }

  initEditor = async () => {
    if (this.inited.value) return

    this.disposer.add(this.subscribe())
    this.initHooks()
    this.inited.dispatch(true)
  }
}

export const Editor = autoBind(new EditorService())
