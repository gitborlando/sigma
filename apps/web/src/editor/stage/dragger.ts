import { Dragger } from '@gitborlando/toolkit/browser'
import { StageViewport } from 'src/editor/stage/viewport'

export const createStageDragger = (stageViewport: StageViewport) =>
  new Dragger({
    processXY: (xy) => stageViewport.toSceneXY(xy),
    processShift: (shift) => stageViewport.toSceneShift(shift),
  })
