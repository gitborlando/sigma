import { iife } from '@gitborlando/utils'
import { entries } from 'mobx'
import { SchemaHelper } from 'src/editor/schema/helper'
import { getSelectIdList, getZoom } from 'src/editor/utils/get'
import { useEditor } from 'src/view/hooks/editor'
import { useSchema } from 'src/view/hooks/schema/use-y-state'
import { themeColor } from 'src/view/styles/color'

type OutlineInfo = {
  hovered: boolean
  selected?: boolean
  color?: string
}

export const EditorStageOutlineComp: FC<{}> = observer(({}) => {
  const editor = useEditor()
  if (editor.stageTransformer.isMoving) return null
  if (editor.stageViewport.isZooming) return null
  if (editor.stageMove.isMoving) return null
  return <EditorStageOutlineCompInner />
})

export const EditorStageOutlineCompInner: FC<{}> = observer(({}) => {
  const editor = useEditor()
  const { hoverId } = editor.stageSelect
  const others = editor.yClients.others

  const outlineInfoLMap = iife(() => {
    const map: Record<string, OutlineInfo> = {}
    for (const [_, client] of entries(others)) {
      for (const id of Object.keys(client.selectIdMap || {})) {
        map[id] = {
          hovered: hoverId === id,
          selected: client.selectIdMap[id],
          color: client.color,
        }
      }
    }
    if (hoverId && !SchemaHelper.isFirstLayerFrame(hoverId)) {
      map[hoverId] = { hovered: true }
    }
    for (const id of getSelectIdList(editor)) {
      map[id] = { hovered: hoverId === id, selected: true }
    }
    return map
  })

  return (
    <>
      {Object.entries(outlineInfoLMap).map(([id, outlineInfo]) => (
        <SingleOutlineComp key={id} id={id} outlineInfo={outlineInfo} />
      ))}
    </>
  )
})

const SingleOutlineComp: FC<{ id: string; outlineInfo: OutlineInfo }> = observer(
  ({ id, outlineInfo }) => {
    const editor = useEditor()
    const { schemaCreator } = editor
    const { color, hovered, selected } = outlineInfo
    const node = T<S.Node>(useSchema((schema) => schema[id]))
    const zoom = getZoom(editor)
    const strokeColor = hovered || selected ? themeColor() : color
    const strokeWidth = selected ? 1 : 2
    const matrix = SchemaHelper.getSceneMatrix(node)
    const outline = schemaCreator.clone<S.Node>(node, {
      id: `${id}-outline`,
      fills: [],
      matrix: matrix,
    })

    if (node.type === 'text') {
      T<S.Text>(outline).style.decoration = schemaCreator.textDecoration({
        color: strokeColor!,
        width: strokeWidth / zoom,
      })
    } else if (strokeWidth) {
      T<S.Node>(outline).strokes = [
        schemaCreator.solidStroke(strokeColor, strokeWidth / zoom),
      ]
    }

    return <elem node={outline} />
  },
)
