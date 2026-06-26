import { Dragger } from '@gitborlando/toolkit/browser'
import type { Editor } from 'src/editor'

export const createStageDrag = (editor: Editor) =>
  new Dragger({
    processXY: (xy) => editor.stageViewport.toSceneXY(xy),
    processShift: (shift) => editor.stageViewport.toSceneShift(shift),
  })
