import { ServiceContainer, ServiceInstances } from '@gitborlando/di-service'
import { Command } from 'src/editor/action/command'
import { NodeAction } from 'src/editor/action/node'
import { PageAction } from 'src/editor/action/page'
import { SelectAction } from 'src/editor/action/select'
import { Undo } from 'src/editor/action/undo'
import { ViewportAction } from 'src/editor/action/viewport'
import { DocCreator } from 'src/editor/doc/creator'
import { DocMutator } from 'src/editor/doc/mutator'
import { ElemDrawer } from 'src/editor/render/elem/drawer'
import { RenderPipeline } from 'src/editor/render/pipeline'
import { RenderSurface } from 'src/editor/render/surface'
import { RenderTree } from 'src/editor/render/tree'
import { Select } from 'src/editor/select'
import { Setting } from 'src/editor/setting'
import { Stage } from 'src/editor/stage'
import { StageCursor } from 'src/editor/stage/cursor'
import { StageEvent } from 'src/editor/stage/event'
import { StageCreate } from 'src/editor/stage/interact/create'
import { StageInteract } from 'src/editor/stage/interact/interact'
import { StageMove } from 'src/editor/stage/interact/move'
import { StageSelect } from 'src/editor/stage/interact/select'
import { StageTransformer } from 'src/editor/stage/transformer'
import { StageViewport } from 'src/editor/stage/viewport'
import { DesignAlign } from 'src/editor/workbench/design/align'
import { DesignFill } from 'src/editor/workbench/design/fill'
import { DesignGeom } from 'src/editor/workbench/design/geom'
import { DesignPicker } from 'src/editor/workbench/design/picker'
import { DesignStroke } from 'src/editor/workbench/design/stroke'
import { LayerNodeTree } from 'src/editor/workbench/layer/node-tree'
import { LayerPageList } from 'src/editor/workbench/layer/page-list'
import { YAware } from 'src/editor/y-adapter/y-aware'
import { YDoc } from 'src/editor/y-adapter/y-doc'
import { YSync } from 'src/editor/y-adapter/y-sync'

const editorServices = {
  /** action */
  undo: Undo,
  command: Command,
  nodeAction: NodeAction,
  pageAction: PageAction,
  selectAction: SelectAction,
  viewportAction: ViewportAction,
  stage: Stage,
  // docAction: DocAction,

  /** render */
  elemDrawer: ElemDrawer,
  renderTree: RenderTree,
  renderSurface: RenderSurface,
  renderPipeline: RenderPipeline,

  /** doc */
  docCreator: DocCreator,
  docMutator: DocMutator,

  /** stage */
  stageCreate: StageCreate,
  stageInteract: StageInteract,
  stageMove: StageMove,
  stageSelect: StageSelect,
  stageEvent: StageEvent,

  /** stage.tools */
  stageCursor: StageCursor,
  stageViewport: StageViewport,
  stageTransformer: StageTransformer,

  /** workbench.design */
  fillPicker: DesignPicker,
  designAlign: DesignAlign,
  designFill: DesignFill,
  designGeom: DesignGeom,
  designStroke: DesignStroke,

  /** workbench.layer */
  layerPageList: LayerPageList,
  layerNodeTree: LayerNodeTree,

  /** yjs */
  yAware: YAware,
  ySync: YSync,
  yDoc: YDoc,

  /** misc */
  setting: Setting,
  select: Select,
}

export type EditorServices = ServiceInstances<typeof editorServices>
export type EditorServiceId = keyof EditorServices

export class Editor extends ServiceContainer<typeof editorServices> {
  protected static instance: Editor

  constructor(global?: ServiceContainer) {
    super(editorServices, global)
  }

  static getInstance(global?: ServiceContainer) {
    if (this.instance) return this.instance
    return (this.instance = new this(global))
  }
}
