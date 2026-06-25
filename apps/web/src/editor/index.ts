import { Disposer } from '@gitborlando/toolkit/disposer'
import { makeObservable } from 'mobx'
import { EditorCommandManager } from 'src/editor/core/command'
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

export class EditorService {
  private inited = false
  private disposer = new Disposer()

  handleNode = this.initService(HandleNodeService)
  handlePage = this.initService(HandlePageService)
  editorSetting = this.initService(EditorSettingService)
  editorCommand = this.initService(EditorCommandManager)
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

  init = async () => {
    if (this.inited) return
    this.disposer.add(this.subscribe())
    this.inited = true
  }

  dispose() {
    this.inited = false
    this.yState.dispose()
    this.disposer.dispose()
  }

  private subscribe() {
    return Disposer.combine(
      this.editorSetting.subscribe(),
      this.editorCommand.subscribe(),

      this.handleNode.subscribe(),
      this.handlePage.subscribe(),

      this.stageSurface.subscribe(),
      this.stageScene.subscribe(),
      this.stageViewport.subscribe(),
      this.stageToolGrid.subscribe(),
      this.stageInteract.subscribe(),
      this.stageCursor.subscribe(),

      this.operateAlign.subscribe(),
      this.operateFill.subscribe(),

      this.layerPanel.subscribe(),
      this.layerPanelNodeTree.subscribe(),
    )
  }

  private initService<T extends object>(service: new () => T) {
    return autoBind(makeObservable(new service()))
  }

  private initServices() {}
}

export const Editor = autoBind(new EditorService())
export const HandleNode = Editor.handleNode
export const HandlePage = Editor.handlePage
export const EditorSetting = Editor.editorSetting
export const EditorCommand = new EditorCommandManager()
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
