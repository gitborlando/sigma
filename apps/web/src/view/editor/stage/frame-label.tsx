import { stopPropagation } from '@gitborlando/utils/browser'
import { clamp } from 'es-toolkit'
import { untracked } from 'mobx'
import { Fragment } from 'react'
import { Matrix, MRect } from 'src/editor/geometry'
import { SchemaHelper } from 'src/editor/schema/helper'
import { useEditorServices } from 'src/view/hooks/editor'
import { useShallow } from 'src/view/hooks/schema/use-shallow'
import { useSelection } from 'src/view/hooks/schema/use-y-client'
import { useSchema } from 'src/view/hooks/schema/use-y-state'
import { themeColor } from 'src/view/styles/color'

const RULER_COLOR = '#9f9f9f'
const FONT_SIZE = 14
const LINE_HEIGHT = 18
const TEXT_WIDTH = 54

export const StageFrameLabelComp: FC<{}> = observer(({}) => {
  const { renderTree, stageViewport } = useEditorServices()

  const isRootFrame = (node: S.SchemaItem): node is S.Frame =>
    SchemaHelper.isRootFrame(node.id)
  const isFrameVisible = (f: S.Frame) => {
    const sceneAABB = untracked(() => stageViewport.sceneAABB)
    return renderTree.elements.get(f.id)?.getVisible(sceneAABB)
  }
  const rootFrames = useSchema(
    useShallow((state) => {
      const items = Object.values(state) as S.SchemaItem[]
      return items.filter(isRootFrame).filter(isFrameVisible)
    }),
  )

  return (
    <Fragment>
      {rootFrames.map((frame) => (
        <FrameLabelComp key={frame.id} frame={frame} />
      ))}
    </Fragment>
  )
})

const FrameLabelComp: FC<{ frame: S.Frame }> = observer(({ frame }) => {
  const { stageViewport, schemaCreator, stageEvent, selectAction, elemDrawer } =
    useEditorServices()
  const { zoom } = stageViewport
  const [hovered, setHovered] = useState(false)
  const selected = useSelection()[frame.id]

  const lineHeight = LINE_HEIGHT / zoom

  const textWidth =
    elemDrawer.textBreaker?.measureWidth(
      frame.name || 'no name',
      `500 ${FONT_SIZE}px GoogleSansCode`,
    ) || TEXT_WIDTH

  const getTextMatrix = (rotation: number, x: number, y: number) =>
    SchemaHelper.getAncestorMatrix(frame)
      .append(Matrix.of(frame.matrix))
      .append(Matrix.identity().rotate(rotation).shift({ x, y }))

  const textMatrix1 = getTextMatrix(0, 0, -lineHeight)
  const textMatrix2 = getTextMatrix(90, frame.width / zoom + lineHeight, 0)
  const textMatrix3 = getTextMatrix(
    180,
    frame.width / zoom,
    frame.height / zoom + lineHeight,
  )
  const textMatrix4 = getTextMatrix(270, -lineHeight, frame.height / zoom)

  const textMatrix = [textMatrix1, textMatrix2, textMatrix3, textMatrix4].find(
    (matrix) => {
      const rotation = new MRect(100, 100, matrix, 1).rotation
      return (
        clamp(rotation, 0, 45) === rotation || clamp(rotation, 315, 360) === rotation
      )
    },
  )

  if (!textMatrix) return null

  const text = schemaCreator.text({
    id: `frame-label-${frame.id}`,
    content: frame.name || 'no name',
    width: textWidth / zoom + 2,
    height: LINE_HEIGHT / zoom,
    matrix: textMatrix,
    style: {
      fontSize: FONT_SIZE / zoom,
      fontWeight: 500,
      align: 'center',
      fontFamily: 'GoogleSansCode',
      fontStyle: 'normal',
      letterSpacing: 0,
      lineHeight: LINE_HEIGHT / zoom,
    },
    fills: [
      schemaCreator.fillColor(hovered || selected ? themeColor() : RULER_COLOR),
    ],
  })

  return (
    <elem
      node={text}
      events={{
        hover: ({ hovered }) => {
          stageEvent.hintId = hovered ? frame.id : undefined
          setHovered(hovered)
        },
        mousedown: stopPropagation(() => {
          selectAction.onPanelSelect(frame.id)
        }),
      }}
    />
  )
})
