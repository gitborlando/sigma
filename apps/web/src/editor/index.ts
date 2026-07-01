import { objKeys } from '@gitborlando/utils'
import { asClass, createContainer } from 'awilix'
import { NodeController } from 'src/editor/controller/node'
import { StageController } from 'src/editor/controller/render'
import { SchemaController } from 'src/editor/controller/schema'
import { SelectController } from 'src/editor/controller/select'
import { ViewportController } from 'src/editor/controller/viewport'
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
import { RenderInvalidatorService } from 'src/editor/render/invalidator'
import { StageRendererService } from 'src/editor/render/renderer'
import { StageSceneService } from 'src/editor/render/scene'
import { StageSurfaceService } from 'src/editor/render/surface'
import { SchemaCreatorService } from 'src/editor/schema/creator'
import { StageCursorService } from 'src/editor/stage/cursor'
import { StageEventService } from 'src/editor/stage/event'
import { StageCreateService } from 'src/editor/stage/interact/create'
import { StageInteractService } from 'src/editor/stage/interact/interact'
import { StageMoveService } from 'src/editor/stage/interact/move'
import { StageSelectService } from 'src/editor/stage/interact/select'
import { StageToolGridService } from 'src/editor/stage/tools/grid'
import { StageTransformerService } from 'src/editor/stage/tools/transformer'
import { StageViewportService } from 'src/editor/stage/viewport'
import { FillPickerService } from 'src/editor/workbench/design-panel/fill-picker'
import { LayerPanelService } from 'src/editor/workbench/layer-panel'
import { LayerPanelNodeTreeService } from 'src/editor/workbench/layer-panel/node-tree'
import { YAwareService } from 'src/editor/y-adapter/y-aware'
import { YStateService } from 'src/editor/y-adapter/y-state'
import { YSyncService } from 'src/editor/y-adapter/y-sync'
import { Service } from 'src/global/service'

const editorServices = {
  nodeController: NodeController,
  selectController: SelectController,
  viewportController: ViewportController,
  stageController: StageController,
  schemaController: SchemaController,

  handleNode: HandleNodeService,
  handlePage: HandlePageService,
  editorSetting: EditorSettingService,
  editorCommand: EditorCommandService,
  undo: UndoService,
  handleSelect: HandleSelectService,
  operateAlign: OperateAlignService,
  operateFill: OperateFillService,
  designGeometry: DesignGeometryService,
  renderInvalidator: RenderInvalidatorService,
  elemDrawer: ElemDrawerService,
  stageScene: StageSceneService,
  stageSurface: StageSurfaceService,
  stageRenderer: StageRendererService,
  schemaCreator: SchemaCreatorService,
  stageCreate: StageCreateService,
  stageInteract: StageInteractService,
  stageMove: StageMoveService,
  stageSelect: StageSelectService,
  stageEvent: StageEventService,
  stageTransformer: StageTransformerService,
  stageCursor: StageCursorService,
  stageViewport: StageViewportService,
  stageToolGrid: StageToolGridService,
  fillPicker: FillPickerService,
  layerPanel: LayerPanelService,
  layerPanelNodeTree: LayerPanelNodeTreeService,
  yAware: YAwareService,
  ySync: YSyncService,
  yState: YStateService,
}

export type EditorServiceId = keyof typeof editorServices

export type EditorServices = {
  [K in EditorServiceId]: InstanceType<(typeof editorServices)[K]>
}

export class Editor extends Service {
  private static editor: Editor

  static getInstance() {
    if (!this.editor) this.initInstance()
    return this.editor
  }

  private static initInstance() {
    return (this.editor = autoBind(new Editor()))
  }

  private container = createContainer<EditorServices>({
    injectionMode: 'CLASSIC',
  })

  constructor() {
    super()
    this.registerServices()
    this.effect(() => (Editor.editor = undefined!))
    this.effect(() => this.container.dispose())
  }

  resolve = <K extends keyof EditorServices>(key: K) => {
    const service = this.container.resolve<EditorServices[K]>(key)
    this.effect(() => service.dispose())
    return service
  }

  private registerServices() {
    objKeys(editorServices).forEach((key: EditorServiceId) => {
      this.container.register(key, asClass(<any>editorServices[key]).singleton())
    })
  }
}
