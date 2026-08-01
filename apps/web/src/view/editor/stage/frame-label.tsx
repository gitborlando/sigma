import { iife } from '@gitborlando/utils'
import { stopPropagation } from '@gitborlando/utils/browser'
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

  const textWidth =
    elemDrawer.textBreaker?.measureWidth(
      frame.name || 'no name',
      `500 ${FONT_SIZE}px GoogleSansCode`,
    ) || TEXT_WIDTH

  const mrect = MRect.of(frame)

  const getMatrix = (x: number, y: number, axis: IXY) => {
    const frameRootMatrix = SchemaHelper.getRootMatrix(frame)
    const xy = Matrix.of(frameRootMatrix).applyXY(XY.$(x, y))
    return Matrix.identity().rotate(mrect.calcRotation(axis)).shift(xy)
  }

  const matrix1 = getMatrix(0, -LINE_HEIGHT, XY.xAxis())
  const matrix2 = getMatrix(frame.width + LINE_HEIGHT, 0, XY.xAxis(90))
  const matrix3 = getMatrix(frame.width, frame.height + LINE_HEIGHT, XY.xAxis(180))
  const matrix4 = getMatrix(-LINE_HEIGHT, frame.height, XY.xAxis(270))

  const matrix = iife(() => {
    let min = 180
    let m1 = matrix1
    ;[matrix2, matrix3, matrix4].forEach((m) => {
      const r = new MRect(1, 1, m).rotation % 180
      if (r < min) {
        min = r
        m1 = m
      }
    })
    return m1
  })

  if (!matrix) return null

  const text = schemaCreator.text({
    id: `frame-label-${frame.id}`,
    content: frame.name || 'no name',
    width: textWidth / zoom + 2,
    height: LINE_HEIGHT / zoom,
    matrix: matrix.plain(),
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
