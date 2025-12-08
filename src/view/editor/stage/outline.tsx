import { iife } from '@gitborlando/utils'
import { entries } from 'mobx'
import { SchemaCreator } from 'src/editor/schema/creator'
import { SchemaHelper } from 'src/editor/schema/helper'
import { StageMove } from 'src/editor/stage/interact/move'
import { StageSelect } from 'src/editor/stage/interact/select'
import { StageTransformer } from 'src/editor/stage/tools/transformer'
import { getZoom, StageViewport } from 'src/editor/stage/viewport'
import { YClients } from 'src/editor/y-state/y-clients'
import { useSchema } from 'src/view/hooks/schema/use-y-state'
import { themeColor } from 'src/view/styles/color'

type OutlineInfo = {
  hovered: boolean
  selected?: boolean
  color?: string
}

export const EditorStageOutlineComp: FC<{}> = observer(({}) => {
  if (StageTransformer.isMoving) return null
  if (StageViewport.isZooming) return null
  if (StageMove.isMoving) return null
  return <EditorStageOutlineCompInner />
})

export const EditorStageOutlineCompInner: FC<{}> = observer(({}) => {
  const { hoverId } = StageSelect
  const others = YClients.others
  const client = YClients.client

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
    for (const [id, selected] of Object.entries(client.selectIdMap)) {
      map[id] = { hovered: hoverId === id, selected: selected as boolean }
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
    const { color, hovered, selected } = outlineInfo
    const node = T<V1.Node>(useSchema((schema) => schema[id]))
    const strokeColor = hovered || selected ? themeColor() : color
    const strokeWidth = selected ? 1 : 2
    const matrix = SchemaHelper.getSceneMatrix(node)
    const outline = SchemaCreator.clone<V1.Node>(node, {
      id: `${id}-outline`,
      fills: [],
      matrix: matrix,
    })

    if (node.type === 'text') {
      T<V1.Text>(outline).style.decoration = SchemaCreator.textDecoration({
        color: strokeColor!,
        width: strokeWidth / getZoom(),
      })
    } else if (strokeWidth) {
      T<V1.Node>(outline).strokes = [
        SchemaCreator.solidStroke(strokeColor, strokeWidth / getZoom()),
      ]
    }

    return <elem node={outline} />
  },
)
