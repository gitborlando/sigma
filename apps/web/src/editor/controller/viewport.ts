import { AABB } from '@gitborlando/geo'
import { Matrix } from 'src/editor/geometry'
import { reflection } from 'first-di'
import { HandleSelectService } from 'src/editor/handle/select'
import { RenderTreeService } from 'src/editor/render/tree'
import { StageViewportService } from 'src/editor/stage/viewport'
import { Service } from 'src/global/service'

@reflection
export class ViewportController extends Service {
  constructor(
    private readonly stageViewport: StageViewportService,
    private readonly handleSelect: HandleSelectService,
    private readonly renderTree: RenderTreeService,
  ) {
    super()
    autoBind(this)
  }

  zoomToFitAll() {
    this.zoomToFit(this.renderTree.sceneElems.map((elem) => elem.aabb))
  }

  zoomToFitSelection() {
    this.zoomToFit(
      this.handleSelect.selectIdList.map((id) => this.renderTree.findElem(id).aabb),
    )
  }

  private zoomToFit(aabbList: AABB[]) {
    if (!aabbList.length) return

    let aabb = AABB.merge(aabbList)
    let rect = AABB.rect(aabb)

    aabb = AABB.extend(aabb, Math.max(rect.width / 10, rect.height / 10))
    rect = AABB.rect(aabb)

    const zoom = this.stageViewport.limitZoom(
      Math.min(
        this.stageViewport.bound.width / rect.width,
        this.stageViewport.bound.height / rect.height,
      ),
    )
    const offset = XY.center(rect).plus(rect).minus(this.stageViewport.boundCenter)

    runInAction(() => {
      this.stageViewport.sceneMatrix = Matrix.identity().shift(
        offset.multiplyNum(-1),
      )
      this.stageViewport.updateZoom(zoom, this.stageViewport.boundCenter)
    })
  }
}
