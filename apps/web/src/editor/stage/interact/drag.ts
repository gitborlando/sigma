import { Dragger } from '@gitborlando/toolkit/browser'
import type { EditorService2 } from 'src/editor'

export const createStageDrag = (editor: EditorService2) =>
  new Dragger({
    processXY: (xy) => editor.stageViewport.toSceneXY(xy),
    processShift: (shift) => editor.stageViewport.toSceneShift(shift),
  })
