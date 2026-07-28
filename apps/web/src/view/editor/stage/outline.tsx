import { iife } from '@gitborlando/utils'
import { entries } from 'mobx'
import { SchemaHelper } from 'src/editor/schema/helper'
import { useEditorServices } from 'src/view/hooks/editor'
import { useSchema } from 'src/view/hooks/schema/use-y-state'
import { themeColor } from 'src/view/styles/color'

type OutlineInfo = { hovered: boolean; selected?: boolean; color?: string }

export const StageOutlineComp: FC<{}> = observer(({}) => {
  const { stageTransformer, stageViewport, stageMove } = useEditorServices()
  if (stageTransformer.isMoving) return null
  if (stageViewport.isZooming) return null
  if (stageMove.isMoving) return null
  return <StageOutlineCompInner />
})

export const StageOutlineCompInner: FC<{}> = observer(({}) => {
  const { stageEvent, handleSelect, yAware } = useEditorServices()
  const { hoverId } = stageEvent
  const others = yAware.others

  const outlineInfoLMap = iife(() => {
    const map: Record<string, OutlineInfo> = {}
    for (const [_, client] of entries(others)) {
      for (const id of Object.keys(client.selection || {})) {
        map[id] = {
          hovered: hoverId === id,
          selected: client.selection[id],
          color: client.color,
        }
      }
    }
    if (hoverId && !SchemaHelper.isRootFrame(hoverId)) {
      map[hoverId] = { hovered: true }
    }
    for (const id of handleSelect.selectIds) {
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
    const { schemaCreator, stageViewport } = useEditorServices()
    const zoom = stageViewport.zoom
    const { color, hovered, selected } = outlineInfo
    const node = T<S.Node>(useSchema((schema) => schema[id]))
    const strokeColor = hovered || selected ? themeColor() : color
    const strokeWidth = selected ? 1 : 2
    const matrix = SchemaHelper.getSceneMatrix(node)
    const outline = schemaCreator.clone<S.Node>(node, {
      id: `${id}-outline`,
      fills: [],
      matrix: matrix,
    })

    if ('strokeSide' in outline) outline.strokeSide = { type: 'all' }

    if (node.type === 'text') {
      T<S.Text>(outline).style.decoration = schemaCreator.textDecoration({
        color: strokeColor!,
        width: strokeWidth / zoom,
      })
    } else if (strokeWidth) {
      T<S.Node>(outline).stroke = schemaCreator.solidStroke(
        strokeColor,
        strokeWidth / zoom,
      )
    }

    return <elem node={outline} />
  },
)
