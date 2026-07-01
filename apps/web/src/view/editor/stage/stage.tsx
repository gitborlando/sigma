import { CSSProperties } from 'react'
import { renderElem } from 'src/editor/render/react/reconciler'
import { SchemaHelper } from 'src/editor/schema/helper'
import { ContextMenu } from 'src/global/context-menu'
import { EditorStageCursorsComp } from 'src/view/editor/stage/cursor'
import { FPSComp } from 'src/view/editor/stage/fps'
import { EditorStageMarqueeComp } from 'src/view/editor/stage/marquee'
import { EditorStageOutlineComp } from 'src/view/editor/stage/outline'
import { RulerComp } from 'src/view/editor/stage/ruler'
import { EditorStageSurfaceComp } from 'src/view/editor/stage/surface'
import { EditorStageTransformComp } from 'src/view/editor/stage/transform'
import { EditorContext, useEditor, useEditorService } from 'src/view/hooks/editor'

export const StageComp: FC<{}> = observer(({}) => {
  const editor = useEditor()
  const editorCommand = useEditorService('editorCommand')
  const selectController = useEditorService('selectController')
  const stageScene = useEditorService('stageScene')
  const stageSelect = useEditorService('stageSelect')
  const handleSelect = useEditorService('handleSelect')

  useEffect(() => {
    return renderElem(
      <EditorContext.Provider value={editor}>
        <EditorStageOutlineComp />
        <EditorStageTransformComp />
        <EditorStageMarqueeComp />
        <EditorStageCursorsComp />
      </EditorContext.Provider>,
      stageScene.widgetRoot,
    )
  }, [editor, stageScene])

  const handleContextMenu = (e: React.MouseEvent) => {
    const { hoverId } = stageSelect
    const { copyPasteGroup, undoRedoGroup, nodeGroup, nodeReHierarchyGroup } =
      editorCommand
    const baseMenus = [copyPasteGroup, undoRedoGroup]

    if (
      !hoverId ||
      !handleSelect.selectIdList.length ||
      SchemaHelper.isFirstLayerFrame(hoverId)
    ) {
      ContextMenu.context = {}
      ContextMenu.menus = baseMenus
      ContextMenu.openMenu(e)
      return
    }

    selectController.onStageSelect(hoverId)
    ContextMenu.context = { id: hoverId }
    ContextMenu.menus = [...baseMenus, nodeGroup, nodeReHierarchyGroup]
    ContextMenu.openMenu(e)
  }

  return (
    <G onContextMenu={handleContextMenu}>
      <EditorStageSurfaceComp />
      <RulerComp />
      <FPSComp />
      <CooperateObservingBorderComp />
    </G>
  )
})

export const CooperateObservingBorderComp: FC<{}> = observer(({}) => {
  const yAware = useEditorService('yAware')
  const { observingClientId: observingUserId } = yAware
  if (!observingUserId) return null

  const client = yAware.others[observingUserId]

  return (
    <G
      className={cls('cooperate-observing-border')}
      style={{ '--color': client.color } as CSSProperties}></G>
  )
})

const cls = classes(css`
  &-cooperate-observing-border {
    position: absolute;
    top: 0;
    left: 0;
    border: 2px solid var(--color);
  }
`)
