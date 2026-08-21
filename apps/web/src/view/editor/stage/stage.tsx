import { CSSProperties } from 'react'
import { DocHelper } from 'src/editor/doc/helper'
import { renderElem } from 'src/editor/render/react/reconciler'
import { ContextMenu } from 'src/global/context-menu'
import { StageCursorsComp } from 'src/view/editor/stage/cursor'
import { FPSComp } from 'src/view/editor/stage/fps'
import { StageFrameLabelComp } from 'src/view/editor/stage/frame-label'
import { StageGridComp } from 'src/view/editor/stage/grid'
import { StageMarqueeComp } from 'src/view/editor/stage/marquee'
import { StageOutlineComp } from 'src/view/editor/stage/outline'
import { StageRulerComp } from 'src/view/editor/stage/ruler'
import { StageTransformComp } from 'src/view/editor/stage/transform'
import {
  EditorContext,
  useEditor,
  useEditorServices,
} from 'src/view/hooks/use-services'

export const StageComp: FC<{}> = observer(({}) => {
  const editor = useEditor()
  const { command, renderTree, stageEvent, stageViewport, stageTransformer } =
    useEditorServices()

  useLayoutEffect(() => {
    return renderElem(
      <EditorContext.Provider value={editor}>
        <StageGridComp />
        <StageOutlineComp />
        <StageTransformComp />
        <StageMarqueeComp />
        <StageCursorsComp />
        <StageRulerComp />
        <StageFrameLabelComp />
      </EditorContext.Provider>,
      renderTree.widgetRoot,
    )
  }, [editor, renderTree])

  const handleContextMenu = (e: React.MouseEvent) => {
    const { hoverId } = stageEvent
    const { copyPasteGroup, undoRedoGroup, nodeGroup, nodeReHierarchyGroup } =
      command
    const baseMenus = [copyPasteGroup, undoRedoGroup]

    if (
      (!hoverId || DocHelper.isRootFrame(hoverId)) &&
      !stageTransformer.isPointIn(stageViewport.toSceneXY(XY.client(e)))
    ) {
      ContextMenu.context = {}
      ContextMenu.menus = baseMenus
      ContextMenu.openMenu(e)
      return
    }

    ContextMenu.context = { id: hoverId }
    ContextMenu.menus = [...baseMenus, nodeGroup, nodeReHierarchyGroup]
    ContextMenu.openMenu(e)
  }

  return (
    <G onContextMenu={handleContextMenu}>
      <SurfaceComp />
      <FPSComp />
      <CooperateObservingBorderComp />
    </G>
  )
})

const SurfaceComp: FC<{}> = observer(({}) => {
  const { renderSurface } = useEditorServices()

  const cls = classes(css`
    /* background-color: #f7f8fa; */
    background-color: var(--gray-bg);
  `)

  return (
    <G className={cls()} ref={renderSurface.setContainer}>
      <canvas ref={renderSurface.setCanvas} />
      <canvas style={{ position: 'absolute' }} ref={renderSurface.setTopCanvas} />
    </G>
  )
})

const CooperateObservingBorderComp = observer<{}>(({}) => {
  const { yAware } = useEditorServices()
  const { observingClientId } = yAware
  if (!observingClientId) return null

  const client = yAware.others[observingClientId]

  const cls = classes(css`
    position: absolute;
    top: 0;
    left: 0;
    border: 2px solid var(--color);
  `)

  return (
    <G className={cls()} style={{ '--color': client.color } as CSSProperties}></G>
  )
})
