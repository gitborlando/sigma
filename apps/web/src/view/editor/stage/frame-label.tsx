import { stopPropagation } from '@gitborlando/utils/browser'
import { untracked } from 'mobx'
import { Fragment } from 'react'
import { Matrix, MRect } from 'src/editor/geometry'
import { SchemaHelper } from 'src/editor/schema/helper'
import { arrayLoopGet } from 'src/view/editor/stage/share'
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

let r = Matrix.$()

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
  const vertices = mrect.vertices

  const getMatrix = (axis: IXY, index: number) => {
    const p1 = arrayLoopGet(vertices, index)
    const p2 = arrayLoopGet(vertices, index + 1)
    const sweep = Angle.sweep(XY.vector(p2, p1))

    const mr = MRect.identity(frame.width, frame.height)
    const rotatedMatrix = Matrix.$()
    const frameRootMatrix = SchemaHelper.getRootMatrix(frame)
    const start = Matrix.of(frameRootMatrix).applyXY(mr.vertices[index])
    rotatedMatrix.rotate(sweep).shift(p1)
    const xy = Matrix.of(rotatedMatrix).applyXY(XY.$(0, -LINE_HEIGHT))
    r = rotatedMatrix
    return Matrix.$().rotate(sweep).shift(xy)
  }

  const matrix1 = getMatrix(XY.xAxis(), 0)
  // const matrix2 = getMatrix(XY.xAxis(90), 1)
  // const matrix3 = getMatrix(XY.xAxis(180), 2)
  // const matrix4 = getMatrix(XY.xAxis(270), 3)

  // const matrix = [matrix1, matrix2, matrix3, matrix4].find((matrix, i) => {
  //   const rootMatrix = Matrix.of(matrix)
  //   const rotation = new MRect(1, 1, rootMatrix, 1).rotation
  //   return (
  //     clamp(rotation, 0, 90) === rotation || clamp(rotation, 270, 360) === rotation
  //   )
  // })
  // if (!matrix) return null

  const text = schemaCreator.text({
    id: `frame-label-${frame.id}`,
    content: frame.name || 'no name',
    width: textWidth / zoom + 2,
    height: LINE_HEIGHT / zoom,
    matrix: matrix1.plain(),
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

  const rect = schemaCreator.rect({
    id: `frame-label-bg-${frame.id}`,
    width: frame.width / zoom,
    height: frame.height / zoom,
    matrix: r.plain(),
  })

  return (
    <>
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
      {/* <elem node={rect} /> */}
    </>
  )
})
