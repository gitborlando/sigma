import { Disposer } from '@gitborlando/toolkit/disposer'
import { EditorCommand } from 'src/editor/editor/command'
import { EditorSetting } from 'src/editor/editor/setting'
import { HandleNode } from 'src/editor/handle/node'
import { HandlePage } from 'src/editor/handle/page'
import { StageScene } from 'src/editor/render/scene'
import { StageSurface } from 'src/editor/render/surface'
import { StageCursor } from 'src/editor/stage/cursor'
import { StageToolGrid } from 'src/editor/stage/tools/grid'
import { LayerPanel } from 'src/editor/workbench/layer-panel'
import { LayerPanelNodeTree } from 'src/editor/workbench/layer-panel/node-tree'
import { OperateAlign } from '../operate/align'
import { OperateFill } from '../operate/fill'
import { StageInteract } from '../stage/interact/interact'
import { StageViewport } from '../stage/viewport'

export class EditorService {
  inited = Signal.create(false)
  private disposer = new Disposer()

  private subscribe() {
    return Disposer.combine(
      EditorSetting.subscribe(),
      EditorCommand.subscribe(),

      HandleNode.subscribe(),
      HandlePage.subscribe(),

      StageSurface.subscribe(),
      StageScene.subscribe(),
      StageViewport.subscribe(),
      StageToolGrid.subscribe(),
      StageInteract.subscribe(),
      StageCursor.subscribe(),

      OperateAlign.subscribe(),
      OperateFill.subscribe(),

      LayerPanel.subscribe(),
      LayerPanelNodeTree.subscribe(),
    )
  }

  init = async () => {
    if (this.inited.value) return

    this.disposer.add(this.subscribe())
    this.inited.dispatch(true)
  }

  dispose() {
    Editor.inited.value = false
    YState.dispose()
    this.disposer.dispose()
  }
}

export const Editor = autoBind(new EditorService())
