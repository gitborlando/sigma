import { RenderPipeline } from 'src/editor/render/pipeline'
import { RenderSurface } from 'src/editor/render/surface'
import { RenderTree } from 'src/editor/render/tree'
import { Select } from 'src/editor/select'
import { StageEvent } from 'src/editor/stage/event'
import { StageInteract } from 'src/editor/stage/interact/interact'
import { Service } from '@gitborlando/di-service'

@reflection
export class Stage extends Service {
  constructor(
    private readonly renderSurface: RenderSurface,
    private readonly renderPipeline: RenderPipeline,
    private readonly renderTree: RenderTree,
    private readonly select: Select,
    private readonly stageInteract: StageInteract,
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
    if (this.select.selectPageId) {
      this.renderSurface.clearSurface()
      this.renderTree.pageFirstRender()
    }
  }
}
