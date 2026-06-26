import { Dragger } from '@gitborlando/toolkit/browser'
import { EditorCommandService } from 'src/editor/core/command'
import { EditorSettingService } from 'src/editor/core/setting'
import { UndoService } from 'src/editor/core/undo'
import { HandleNodeService } from 'src/editor/handle/node'
import { HandlePageService } from 'src/editor/handle/page'
import { HandleSelectService } from 'src/editor/handle/select'
import { OperateAlignService } from 'src/editor/operate/align'
import { OperateFillService } from 'src/editor/operate/fill'
import { DesignGeometryService } from 'src/editor/operate/geometry'
import { ElemDrawerService } from 'src/editor/render/draw'
import { StageSceneService } from 'src/editor/render/scene'
import { StageSurfaceService } from 'src/editor/render/surface'
import { SchemaCreatorService } from 'src/editor/schema/creator'
import { EditorService } from 'src/editor/service'
import { StageCursorService } from 'src/editor/stage/cursor'
import { StageCreateService } from 'src/editor/stage/interact/create'
import { StageInteractService } from 'src/editor/stage/interact/interact'
import { StageMoveService } from 'src/editor/stage/interact/move'
import { StageSelectService } from 'src/editor/stage/interact/select'
import { StageToolGridService } from 'src/editor/stage/tools/grid'
import { StageTransformerService } from 'src/editor/stage/tools/transformer'
import { StageViewportService } from 'src/editor/stage/viewport'
import { LayerPanelService } from 'src/editor/workbench/layer-panel'
import { LayerPanelNodeTreeService } from 'src/editor/workbench/layer-panel/node-tree'
import { YClientsService } from 'src/editor/y-adapter/y-clients'
import { YStateService } from 'src/editor/y-adapter/y-state'
import { YSyncService } from 'src/editor/y-adapter/y-sync'
import { Service } from 'src/global/service'

export class EditorService2 extends Service {
  private static editor: EditorService2

  static getInstance() {
    if (!this.editor) this.initInstance()
    return this.editor
  }

  static initInstance() {
    const editor = (this.editor = autoBind(new EditorService2()))
    const dispose = editor.subscribe()
    return { editor, dispose }
  }

  stageDragger = new Dragger({
    processXY: (xy) => this.stageViewport.toSceneXY(xy),
    processShift: (shift) => this.stageViewport.toSceneShift(shift),
  })

  services: EditorService[] = []

  handleNode = this.initService(HandleNodeService)
  handlePage = this.initService(HandlePageService)
  editorSetting = this.initService(EditorSettingService)
  editorCommand = this.initService(EditorCommandService)
  undo = this.initService(UndoService)
  handleSelect = this.initService(HandleSelectService)
  operateAlign = this.initService(OperateAlignService)
  operateFill = this.initService(OperateFillService)
  designGeometry = this.initService(DesignGeometryService)
  elemDrawer = this.initService(ElemDrawerService)
  stageScene = this.initService(StageSceneService)
  stageSurface = this.initService(StageSurfaceService)
  schemaCreator = this.initService(SchemaCreatorService)
  stageCreate = this.initService(StageCreateService)
  stageInteract = this.initService(StageInteractService)
  stageMove = this.initService(StageMoveService)
  stageSelect = this.initService(StageSelectService)
  stageTransformer = this.initService(StageTransformerService)
  stageCursor = this.initService(StageCursorService)
  stageViewport = this.initService(StageViewportService)
  stageToolGrid = this.initService(StageToolGridService)
  layerPanel = this.initService(LayerPanelService)
  layerPanelNodeTree = this.initService(LayerPanelNodeTreeService)
  yClients = this.initService(YClientsService)
  ySync = this.initService(YSyncService)
  yState = this.initService(YStateService)

  private initService<T extends EditorService>(
    Service: new (editor: EditorService2) => T,
  ) {
    const service = autoBind(makeObservable(new Service(this)))
    this.services.push(service)
    return service
  }

  subscribe() {
    this.disposer.add(...this.services.map((s) => s.subscribe()))
    return () => {
      this.yState.dispose()
      this.disposer.dispose()
    }
  }

  /** alias */
  find = <T extends S.SchemaItem>(id: string) => {
    return this.yState.find<T>(id)
  }
}

export const Editor = autoBind(new EditorService2())
export const HandleNode = Editor.handleNode
export const HandlePage = Editor.handlePage
export const EditorSetting = Editor.editorSetting
export const EditorCommand = Editor.editorCommand
export const Undo = Editor.undo
export const HandleSelect = Editor.handleSelect
export const OperateAlign = Editor.operateAlign
export const OperateFill = Editor.operateFill
export const DesignGeometry = Editor.designGeometry
export const ElemDrawer = Editor.elemDrawer
export const StageScene = Editor.stageScene
export const StageSurface = Editor.stageSurface
export const SchemaCreator = Editor.schemaCreator
export const StageCreate = Editor.stageCreate
export const StageInteract = Editor.stageInteract
export const StageMove = Editor.stageMove
export const StageSelect = Editor.stageSelect
export const StageTransformer = Editor.stageTransformer
export const StageCursor = Editor.stageCursor
export const StageViewport = Editor.stageViewport
export const LayerPanel = Editor.layerPanel
export const LayerPanelNodeTree = Editor.layerPanelNodeTree
export const YClients = Editor.yClients
export const YSync = Editor.ySync
export const YState = Editor.yState
