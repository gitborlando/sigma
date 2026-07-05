import { DI, type ClassConstructor } from 'first-di'
import { NodeController } from 'src/editor/controller/node'
import { SchemaController } from 'src/editor/controller/schema'
import { SelectController } from 'src/editor/controller/select'
import { StageController } from 'src/editor/controller/stage'
import { ViewportController } from 'src/editor/controller/viewport'
import { CommandService } from 'src/editor/core/command'
import { SettingService } from 'src/editor/core/setting'
import { UndoService } from 'src/editor/core/undo'
import { HandleNodeService } from 'src/editor/handle/node'
import { HandlePageService } from 'src/editor/handle/page'
import { HandleSelectService } from 'src/editor/handle/select'
import { OperateFillService } from 'src/editor/operate/fill'
import { DesignGeometryService } from 'src/editor/operate/geometry'
import { ElemDrawerService } from 'src/editor/render/drawer'
import { RenderInvalidatorService } from 'src/editor/render/invalidator'
import { RendererService } from 'src/editor/render/renderer'
import { RenderSurfaceService } from 'src/editor/render/surface'
import { RenderTreeService } from 'src/editor/render/tree'
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
import { DesignAlignService } from 'src/editor/workbench/design-panel/align'
import { FillPickerService } from 'src/editor/workbench/design-panel/fill-picker'
import { LayerPanelService } from 'src/editor/workbench/layer-panel'
import { LayerPanelNodeTreeService } from 'src/editor/workbench/layer-panel/node-tree'
import { YAwareService } from 'src/editor/y-adapter/y-aware'
import { YStateService } from 'src/editor/y-adapter/y-state'
import { YSyncService } from 'src/editor/y-adapter/y-sync'
import { Service } from 'src/global/service'

const editorServices = {
  /** controller */
  nodeController: NodeController,
  selectController: SelectController,
  viewportController: ViewportController,
  stageController: StageController,
  schemaController: SchemaController,

  /** core */
  setting: SettingService,
  command: CommandService,
  undo: UndoService,

  /** handle */
  handleNode: HandleNodeService,
  handlePage: HandlePageService,
  handleSelect: HandleSelectService,

  /** render */
  renderInvalidator: RenderInvalidatorService,
  elemDrawer: ElemDrawerService,
  renderTree: RenderTreeService,
  renderSurface: RenderSurfaceService,
  renderer: RendererService,

  /** schema */
  schemaCreator: SchemaCreatorService,

  /** stage */
  stageCreate: StageCreateService,
  stageInteract: StageInteractService,
  stageMove: StageMoveService,
  stageSelect: StageSelectService,
  stageEvent: StageEventService,

  /** tools */
  stageCursor: StageCursorService,
  stageViewport: StageViewportService,
  stageTransformer: StageTransformerService,
  stageToolGrid: StageToolGridService,

  /** workbench.design */
  fillPicker: FillPickerService,
  designAlign: DesignAlignService,
  operateFill: OperateFillService,
  designGeometry: DesignGeometryService,

  /** workbench.layer */
  layerPanel: LayerPanelService,
  layerPanelNodeTree: LayerPanelNodeTreeService,

  /** yjs */
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

  private container = new (class EditorDI extends DI {
    dispose() {
      ;[...this.singletonsList.values()]
        .filter((s) => s instanceof Service)
        .forEach((s) => s.dispose())
      this.reset()
    }
  })()

  constructor() {
    super()
    this.effect(() => this.container.dispose())
    this.effect(() => (Editor.editor = undefined!))
  }

  resolve = <K extends EditorServiceId>(key: K) => {
    return this.container.singleton(
      editorServices[key] as ClassConstructor<EditorServices[K]>,
    )
  }
}
