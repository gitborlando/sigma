import { Dragger } from '@gitborlando/toolkit/browser'
import { StageViewportService } from 'src/editor/stage/viewport'

export const createStageDragger = (stageViewport: StageViewportService) =>
  new Dragger({
    processXY: (xy) => stageViewport.toSceneXY(xy),
    processShift: (shift) => stageViewport.toSceneShift(shift),
  })
