import { HandleSelectService } from 'src/editor/handle/select'
import { RendererService } from 'src/editor/render/renderer'
import { reflection } from 'first-di'
import { RenderSurfaceService } from 'src/editor/render/surface'
import { RenderTreeService } from 'src/editor/render/tree'
import { StageEventService } from 'src/editor/stage/event'
import { StageInteractService } from 'src/editor/stage/interact/interact'
import { Service } from 'src/global/service'

@reflection
export class StageController extends Service {
  constructor(
    private readonly renderSurface: RenderSurfaceService,
    private readonly renderer: RendererService,
    private readonly stageEvent: StageEventService,
    private readonly renderTree: RenderTreeService,
    private readonly handleSelect: HandleSelectService,
    private readonly stageInteract: StageInteractService,
  ) {
    super()
    autoBind(this)
  }

  onCanvasInited() {
    this.renderSurface.onCanvasInited()
    this.renderer.onCanvasInited()
    this.stageEvent.onCanvasInited()
    this.stageInteract.onInteract()
    this.effect(autorun(this.renderOnInited))
    this.effect(this.renderTree.hookPatchRender())
  }

  private renderOnInited() {
    if (this.handleSelect.selectPageId) {
      this.renderSurface.clearSurface()
      this.renderTree.firstRenderPage()
      this.renderer.requestFirstFullRender()
      this.renderer.requestTopCanvasRender()
    }
  }
}
