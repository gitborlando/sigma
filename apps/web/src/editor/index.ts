import { DI, type ClassConstructor } from 'first-di'
import { Command } from 'src/editor/action/command'
import { DocAction } from 'src/editor/action/doc'
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
import { Service } from 'src/global/service'

const editorServices = {
  /** action */
  undo: Undo,
  command: Command,
  nodeAction: NodeAction,
  pageAction: PageAction,
  selectAction: SelectAction,
  viewportAction: ViewportAction,
  stage: Stage,
  docAction: DocAction,

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

type ServiceInstances<T> = {
  [K in keyof T]: T[K] extends ClassConstructor<infer S> ? S : never
}

export type EditorServices = ServiceInstances<typeof editorServices>
export type EditorServiceId = keyof EditorServices

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
    this.effect(() => {
      if (Editor.editor === this) Editor.editor = undefined!
    })
  }

  resolve = <K extends EditorServiceId>(key: K): EditorServices[K] => {
    return this.container.singleton(
      editorServices[key] as ClassConstructor<EditorServices[K]>,
    )
  }
}
