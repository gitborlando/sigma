import { HandleSelect } from 'src/editor/handle/select'
import { RenderPipeline } from 'src/editor/render/pipeline'
import { RenderSurface } from 'src/editor/render/surface'
import { RenderTree } from 'src/editor/render/tree'
import { StageEvent } from 'src/editor/stage/event'
import { StageInteract } from 'src/editor/stage/interact/interact'
import { StageSelect } from 'src/editor/stage/interact/select'
import { Service } from 'src/global/service'

@reflection
export class StageController extends Service {
  constructor(
    private readonly renderSurface: RenderSurface,
    private readonly renderPipeline: RenderPipeline,
    private readonly renderTree: RenderTree,
    private readonly handleSelect: HandleSelect,
    private readonly stageInteract: StageInteract,
    private readonly stageSelect: StageSelect,
    private readonly stageEvent: StageEvent,
  ) {
    super()
    autoBind(this)
  }

  onCanvasInited() {
    this.renderSurface.onCanvasInited()
    this.renderPipeline.onCanvasInited()
    this.stageEvent.onCanvasInited()
    this.stageInteract.onInteract()
    this.renderTree.onPatchRender()
    this.effect(autorun(this.renderPage))
  }

  private renderPage() {
    if (this.handleSelect.selectPageId) {
      this.renderSurface.clearSurface()
      this.renderTree.pageFirstRender()
    }
  }
}
