import { Service } from '@gitborlando/di-service'
import autoBind from 'auto-bind'
import { Undo } from 'src/editor/action/undo'
import { setupDocGetter } from 'src/editor/doc/getter'
import { RenderPipeline } from 'src/editor/render/pipeline'
import { RenderSurface } from 'src/editor/render/surface'
import { RenderTree } from 'src/editor/render/tree'
import { Select } from 'src/editor/select'
import { StageCursor } from 'src/editor/stage/cursor'
import { StageEvent } from 'src/editor/stage/event'
import { StageInteract } from 'src/editor/stage/interact/interact'
import { LayerNodeTree } from 'src/editor/workbench/layer/node-tree'
import { YDoc } from 'src/editor/y-adapter/y-doc'

@reflection
export class Session extends Service {
  constructor(
    private readonly yDoc: YDoc,
    private readonly undo: Undo,
    private readonly select: Select,
    private readonly renderSurface: RenderSurface,
    private readonly renderPipeline: RenderPipeline,
    private readonly renderTree: RenderTree,
    private readonly stageInteract: StageInteract,
    private readonly stageEvent: StageEvent,
    private readonly stageCursor: StageCursor,
    private readonly layerNodeTree: LayerNodeTree,
  ) {
    super()
    autoBind(this)
  }

  sessionId = ''

  async setupFile(id: string, doc?: S.Doc) {
    if (id === this.sessionId) return

    await this.yDoc.setup(id, doc)
    setupDocGetter(() => this.yDoc.doc)

    this.yDoc.register(this.layerNodeTree.onYDocPatch)
    // this.yDoc.onPatch(this.nodeAction.onYDocPatch)

    // this.ySync.setup(id, this.yDoc.yDoc)
    // this.yAware.init({
    //   clientId: this.yDoc.doc.clientID,
    //   awareness: this.ySync.awareness,
    // })
    this.undo.setup()

    this.select.selectPage(this.yDoc.doc.meta.pageIds[0])
    this.undo.mobxUndo.rebase()

    this.sessionId = id
    this.effect(() => (this.sessionId = ''))

    return this.yDoc.doc
  }

  onCanvasInited() {
    this.renderSurface.onCanvasInited()
    this.renderPipeline.onCanvasInited()
    this.stageEvent.onCanvasInited()
    this.stageInteract.onInteract()
    this.renderTree.onPatchRender()
    this.stageCursor.setCursor('select')
    this.effect(autorun(this.renderPage))
  }

  private renderPage() {
    if (this.select.selectPageId) {
      this.renderSurface.clearSurface()
      this.renderTree.pageFirstRender()
    }
  }
}
