import { DocHelper } from 'src/editor/doc/helper'
import { iife } from '@gitborlando/utils'
import { withPrepare } from '@gitborlando/utils/react'
import { Fragment } from 'react'
import { useDoc } from 'src/view/hooks/use-doc'
import { useEditorServices } from 'src/view/hooks/use-services'
import { themeColor } from 'src/view/styles/color'

type OutlineInfo = {
  hovered?: boolean
  hinted?: boolean
  selected?: boolean
  color?: string
}

export const StageOutlineComp: FC<{}> = observer(({}) => {
  const { stageEvent, select, yAware } = useEditorServices()
  const { hoverId, hintId } = stageEvent
  const others = yAware.others

  const outlineInfoLMap = iife(() => {
    const map: Record<string, OutlineInfo> = {}
    for (const [_, client] of Object.entries(others)) {
      for (const id of Object.keys(client.selection || {})) {
        map[id] = {
          hovered: hoverId === id,
          selected: client.selection[id],
          color: client.color,
        }
      }
    }
    if (hintId) map[hintId] = { hinted: true }
    if (hoverId) map[hoverId] = { hovered: true }
    for (const id of select.selectIds) {
      map[id] = { hovered: hoverId === id, selected: true }
    }
    return map
  })

  return (
    <Fragment>
      {Object.entries(outlineInfoLMap).map(([id, outlineInfo]) => (
        <SingleOutline key={id} id={id} outlineInfo={outlineInfo} />
      ))}
    </Fragment>
  )
})

const SingleOutline = observer(
  withPrepare<{ node: S.Node }, { id: string; outlineInfo: OutlineInfo }>(
    ({ id }) => {
      const node = useDoc((doc) => doc.graphs[id])
      return node?.type === 'node' ? { node } : null
    },
    observer(({ id, node, outlineInfo }) => {
      const { docHelper, docCreator, stageViewport, stageTransformer } =
        useEditorServices()

      const { color, hovered, hinted, selected } = outlineInfo
      const zoom = stageViewport.zoom
      const strokeColor = hovered || hinted || selected ? themeColor() : color
      const strokeWidth = iife(() => {
        let width = selected ? 1 : 2
        if (stageTransformer.isMoving && !hinted) width = 0
        return width
      })
      const matrix = docHelper.getRootMatrix(node)
      const outline = DocHelper.clone<S.Node>(node, {
        id: `${id}-outline`,
        fills: [],
        matrix: matrix,
      })

      if ('strokeSide' in outline) outline.strokeSide = { type: 'all' }

      if (node.variant === 'text') {
        T<S.Text>(outline).style.decoration = docCreator.textDecoration({
          color: strokeColor!,
          width: strokeWidth / zoom,
        })
      } else if (strokeWidth) {
        T<S.Node>(outline).stroke = docCreator.solidStroke(
          strokeColor,
          strokeWidth / zoom,
        )
      }

      return <elem node={outline} />
    }),
  ),
)
