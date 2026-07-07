import { DI, type ClassConstructor } from 'first-di'
import { NodeController } from 'src/editor/controller/node'
import { SchemaController } from 'src/editor/controller/schema'
import { SelectController } from 'src/editor/controller/select'
import { StageController } from 'src/editor/controller/stage'
import { ViewportController } from 'src/editor/controller/viewport'
import { EditorCommand } from 'src/editor/core/command'
import { Setting } from 'src/editor/core/setting'
import { Undo } from 'src/editor/core/undo'
import { HandleNode } from 'src/editor/handle/node'
import { HandlePage } from 'src/editor/handle/page'
import { HandleSelect } from 'src/editor/handle/select'
import { OperateFill } from 'src/editor/operate/fill'
import { DesignGeometry } from 'src/editor/operate/geometry'
import { ElemDrawer } from 'src/editor/render/drawer'
import { RenderInvalidator } from 'src/editor/render/invalidator'
import { Renderer } from 'src/editor/render/renderer'
import { RenderSurface } from 'src/editor/render/surface'
import { RenderTree } from 'src/editor/render/tree'
import { SchemaCreator } from 'src/editor/schema/creator'
import { StageCursor } from 'src/editor/stage/cursor'
import { StageEvent } from 'src/editor/stage/event'
import { StageCreate } from 'src/editor/stage/interact/create'
import { StageInteract } from 'src/editor/stage/interact/interact'
import { StageMove } from 'src/editor/stage/interact/move'
import { StageSelect } from 'src/editor/stage/interact/select'
import { StageTransformer } from 'src/editor/stage/tools/transformer'
import { StageViewport } from 'src/editor/stage/viewport'
import { DesignAlign } from 'src/editor/workbench/design-panel/align'
import { FillPicker } from 'src/editor/workbench/design-panel/fill-picker'
import { LayerPanel } from 'src/editor/workbench/layer-panel'
import { LayerPanelNodeTree } from 'src/editor/workbench/layer-panel/node-tree'
import { YAware } from 'src/editor/y-adapter/y-aware'
import { YState } from 'src/editor/y-adapter/y-state'
import { YSync } from 'src/editor/y-adapter/y-sync'
import { Service } from 'src/global/service'

const editorServices = {
  /** controller */
  nodeController: NodeController,
  selectController: SelectController,
  viewportController: ViewportController,
  stageController: StageController,
  schemaController: SchemaController,

  /** core */
  setting: Setting,
  command: EditorCommand,
  undo: Undo,

  /** handle */
  handleNode: HandleNode,
  handlePage: HandlePage,
  handleSelect: HandleSelect,

  /** render */
  renderInvalidator: RenderInvalidator,
  elemDrawer: ElemDrawer,
  renderTree: RenderTree,
  renderSurface: RenderSurface,
  renderer: Renderer,

  /** schema */
  schemaCreator: SchemaCreator,

  /** stage */
  stageCreate: StageCreate,
  stageInteract: StageInteract,
  stageMove: StageMove,
  stageSelect: StageSelect,
  stageEvent: StageEvent,

  /** tools */
  stageCursor: StageCursor,
  stageViewport: StageViewport,
  stageTransformer: StageTransformer,

  /** workbench.design */
  fillPicker: FillPicker,
  designAlign: DesignAlign,
  operateFill: OperateFill,
  designGeometry: DesignGeometry,

  /** workbench.layer */
  layerPanel: LayerPanel,
  layerPanelNodeTree: LayerPanelNodeTree,

  /** yjs */
  yAware: YAware,
  ySync: YSync,
  yState: YState,
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
