import { Disposer } from '@gitborlando/toolkit'
import { objKeys } from '@gitborlando/utils'
import { asClass, createContainer } from 'awilix'
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

export class Editor extends Service {
  private static editor: Editor

  static getInstance() {
    if (!this.editor) this.initInstance()
    return this.editor
  }

  static initInstance() {
    const editor = (this.editor = autoBind(new Editor()))
    const dispose = editor.subscribe()
    return { editor, dispose }
  }

  container = createContainer<EditorServices>({ injectionMode: 'CLASSIC' })

  constructor() {
    super()
    objKeys(editorServices).forEach((key) => {
      const service = editorServices[key] as new () => any
      this.container.register(key, asClass(service).singleton())
    })
  }

  subscribe() {
    return Disposer.combine(
      ...objKeys(editorServices).map((key) =>
        this.container.resolve(key).subscribe(),
      ),
    )
  }
}
