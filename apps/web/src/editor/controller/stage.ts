import { HandleSelect } from 'src/editor/handle/select'
import { Renderer } from 'src/editor/render/renderer'
import { reflection } from 'first-di'
import { RenderSurface } from 'src/editor/render/surface'
import { RenderTree } from 'src/editor/render/tree'
import { StageEvent } from 'src/editor/stage/event'
import { StageInteract } from 'src/editor/stage/interact/interact'
import { Service } from 'src/global/service'

@reflection
export class StageController extends Service {
  constructor(
    private readonly renderSurface: RenderSurface,
    private readonly renderer: Renderer,
    private readonly stageEvent: StageEvent,
    private readonly renderTree: RenderTree,
    private readonly handleSelect: HandleSelect,
    private readonly stageInteract: StageInteract,
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
