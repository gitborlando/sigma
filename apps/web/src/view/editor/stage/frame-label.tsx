import { stopPropagation } from '@gitborlando/utils/browser'
import { clamp } from 'es-toolkit'
import { untracked } from 'mobx'
import { Fragment } from 'react'
import { DocHelper } from 'src/editor/doc/helper'
import { Matrix, MRect } from 'src/editor/geometry'
import { useDoc } from 'src/view/hooks/use-doc'
import { useSelection } from 'src/view/hooks/use-selection'
import { useEditorServices } from 'src/view/hooks/use-services'
import { useShallow } from 'src/view/hooks/use-shallow'
import { themeColor } from 'src/view/styles/color'

const RULER_COLOR = '#9f9f9f'
const FONT_SIZE = 14
const LINE_HEIGHT = 18
const TEXT_WIDTH = 54

export const StageFrameLabelComp: FC<{}> = observer(({}) => {
  const { renderTree, stageViewport } = useEditorServices()

  const isRootFrame = (graph: S.Graph): graph is S.Frame =>
    DocHelper.isRootFrame(graph.id)
  const isFrameVisible = (f: S.Frame) => {
    const sceneAABB = untracked(() => stageViewport.sceneAABB)
    return renderTree.elements.get(f.id)?.getVisible(sceneAABB)
  }
  const rootFrames = useDoc(
    useShallow((state) => {
      const graphs = Object.values(state.graphs) as S.Graph[]
      return graphs.filter(isRootFrame).filter(isFrameVisible)
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
  const { stageViewport, docCreator, stageEvent, selectAction, elemDrawer } =
    useEditorServices()
  const { zoom } = stageViewport
  const [hovered, setHovered] = useState(false)
  const selected = useSelection()[frame.id]

  const textWidth =
    elemDrawer.textBreaker?.measureWidth(
      frame.name || 'no name',
      `500 ${FONT_SIZE}px GoogleSansCode`,
    ) || TEXT_WIDTH

  const getTextMatrix = (rotation: number, x: number, y: number) =>
    DocHelper.getAncestorMatrix(frame)
      .append(Matrix.of(frame.matrix))
      .append(
        Matrix.identity()
          .rotate(rotation)
          .shift(XY.from(x, y).multiplyNum(1 / zoom)),
      )

  const textMatrix1 = getTextMatrix(0, 0, -LINE_HEIGHT)
  const textMatrix2 = getTextMatrix(90, frame.width + LINE_HEIGHT, 0)
  const textMatrix3 = getTextMatrix(180, frame.width, frame.height + LINE_HEIGHT)
  const textMatrix4 = getTextMatrix(270, -LINE_HEIGHT, frame.height)

  const textMatrix = [textMatrix1, textMatrix2, textMatrix3, textMatrix4].find(
    (matrix) => {
      const rotation = new MRect(1, 1, matrix, 1).rotation
      return (
        clamp(rotation, 0, 45) === rotation || clamp(rotation, 315, 360) === rotation
      )
    },
  )

  if (!textMatrix) return null

  const text = docCreator.text({
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
    fills: [docCreator.fillColor(hovered || selected ? themeColor() : RULER_COLOR)],
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
