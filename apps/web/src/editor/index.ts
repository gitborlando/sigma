import { objKeys } from '@gitborlando/utils'
import { asClass, asValue, createContainer } from 'awilix'
import { NodeControllerService } from 'src/editor/controller/node'
import { SelectControllerService } from 'src/editor/controller/select'
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

const editorServices = {
  nodeController: NodeControllerService,
  selectController: SelectControllerService,

  handleNode: HandleNodeService,
  handlePage: HandlePageService,
  editorSetting: EditorSettingService,
  editorCommand: EditorCommandService,
  undo: UndoService,
  handleSelect: HandleSelectService,
  operateAlign: OperateAlignService,
  operateFill: OperateFillService,
  designGeometry: DesignGeometryService,
  elemDrawer: ElemDrawerService,
  stageScene: StageSceneService,
  stageSurface: StageSurfaceService,
  schemaCreator: SchemaCreatorService,
  stageCreate: StageCreateService,
  stageInteract: StageInteractService,
  stageMove: StageMoveService,
  stageSelect: StageSelectService,
  stageTransformer: StageTransformerService,
  stageCursor: StageCursorService,
  stageViewport: StageViewportService,
  stageToolGrid: StageToolGridService,
  layerPanel: LayerPanelService,
  layerPanelNodeTree: LayerPanelNodeTreeService,
  yClients: YClientsService,
  ySync: YSyncService,
  yState: YStateService,
}

type EditorServices = {
  [K in keyof typeof editorServices]: InstanceType<(typeof editorServices)[K]>
}

export type { EditorServices }

export type EditorServiceGetters = {
  getEditorCommand: () => EditorCommandService
  getEditorSetting: () => EditorSettingService
  getElemDrawer: () => ElemDrawerService
  getStageInteract: () => StageInteractService
  getStageScene: () => StageSceneService
  getStageSurface: () => StageSurfaceService
  getStageViewport: () => StageViewportService
  getYClients: () => YClientsService
}

const createEditorServiceGetters = (
  resolve: <T>(name: string) => T,
): EditorServiceGetters => ({
  getEditorCommand: () => resolve('editorCommand'),
  getEditorSetting: () => resolve('editorSetting'),
  getElemDrawer: () => resolve('elemDrawer'),
  getStageInteract: () => resolve('stageInteract'),
  getStageScene: () => resolve('stageScene'),
  getStageSurface: () => resolve('stageSurface'),
  getStageViewport: () => resolve('stageViewport'),
  getYClients: () => resolve('yClients'),
})

export class Editor extends Service {
  private static editor: Editor

  static getInstance() {
    if (!this.editor) this.initInstance()
    return this.editor
  }

  private static initInstance() {
    return (this.editor = autoBind(new Editor()))
  }

  private container = createContainer<EditorServices & EditorServiceGetters>({
    injectionMode: 'CLASSIC',
  })

  constructor() {
    super()
    this.setupServices()
    this.effect(() => (Editor.editor = undefined!))
    this.effect(() => this.container.dispose())
  }

  private setupServices() {
    objKeys(editorServices).forEach((key) => {
      this.container.register(key, asClass(editorServices[key]).singleton())
    })
    const editorServiceGetters = createEditorServiceGetters(this.resolve)
    objKeys(editorServiceGetters).forEach((key) => {
      this.container.register(key, asValue(editorServiceGetters[key]))
    })
  }

  resolve = <K extends keyof EditorServices>(key: K) =>
    this.container.resolve<EditorServices[K]>(key)
}
