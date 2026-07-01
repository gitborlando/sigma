import { HandleSelectService } from 'src/editor/handle/select'
import { StageRendererService } from 'src/editor/render/renderer'
import { StageSceneService } from 'src/editor/render/scene'
import { StageSurfaceService } from 'src/editor/render/surface'
import { StageEventService } from 'src/editor/stage/event'
import { Service } from 'src/global/service'

export class StageController extends Service {
  constructor(
    private readonly stageSurface: StageSurfaceService,
    private readonly stageRenderer: StageRendererService,
    private readonly stageEvent: StageEventService,
    private readonly stageScene: StageSceneService,
    private readonly handleSelect: HandleSelectService,
  ) {
    super()
    autoBind(this)
  }

  onCanvasInited() {
    this.stageSurface.onCanvasInited()
    this.stageRenderer.onCanvasInited()
    this.stageEvent.onCanvasInited()
    this.effect(autorun(this.renderOnInited))
    this.effect(this.stageScene.hookPatchRender())
  }

  private renderOnInited() {
    if (this.handleSelect.selectPageId) {
      this.stageSurface.clearSurface()
      this.stageScene.firstRenderPage()
      this.stageRenderer.requestFirstFullRender()
      this.stageRenderer.requestTopCanvasRender()
    }
  }
}
