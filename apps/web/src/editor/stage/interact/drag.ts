import { Dragger } from '@gitborlando/toolkit/browser'
import { StageViewport } from 'src/editor/stage/viewport'

export const StageDrag = new Dragger({
  processXY: (xy) => StageViewport.toSceneXY(xy),
  processShift: (shift) => StageViewport.toSceneShift(shift),
})
