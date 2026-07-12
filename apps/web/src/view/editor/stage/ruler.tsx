import { Matrix } from 'src/editor/geometry'
import { snapSceneXYToHalfPixel } from 'src/editor/utils/misc'
import { useEditorServices } from 'src/view/hooks/editor'

const RULER_COLOR = '#9f9f9f'
const TICK_SIZE = 4
const FONT_SIZE = 10
const LINE_HEIGHT = 12
const TEXT_WIDTH = 40

const getNearestIntMultiple = (number: number, rate: number) => {
  const n = Math.floor(number / rate)
  const left = rate * n
  const right = rate * (n + 1)
  return number - left <= right - number ? left : right
}

export const StageRulerComp: FC<{}> = observer(({}) => {
  return (
    <>
      <Ruler type='horizontal' />
      <Ruler type='vertical' />
    </>
  )
})

export const Ruler: FC<{ type: 'horizontal' | 'vertical' }> = observer(
  ({ type }) => {
    const { stageViewport, handleNode } = useEditorServices()
    const { bound, zoom, offset: offsetXY } = stageViewport
    const datumXY = handleNode.datumXY

    const getTicks = () => {
      const ticks: { offset: number; value: number }[] = []
      const length = (type === 'horizontal' ? bound.width : bound.height) / zoom
      const offset =
        (type === 'horizontal' ? offsetXY.x + datumXY.x : offsetXY.y + datumXY.y) /
        zoom
      const step = stageViewport.getStepByZoom(zoom)
      const start = getNearestIntMultiple(-offset, step)
      const end = getNearestIntMultiple(length - offset, step)
      for (let i = start; i <= end; i += step) {
        const y = (i + offset) * zoom
        ticks.push({ offset: y, value: i })
      }
      return ticks
    }

    return (
      <>
        {getTicks().map(({ offset, value }) => (
          <Tick key={`${type}-${value}`} type={type} offset={offset} value={value} />
        ))}
      </>
    )
  },
)

export const Tick: FC<{
  type: 'horizontal' | 'vertical'
  offset: number
  value: number
}> = observer(({ type, offset, value }) => {
  const { schemaCreator, stageViewport } = useEditorServices()
  const { sceneMatrix, zoom } = stageViewport
  const isVertical = type === 'vertical'
  const snapAxis = isVertical ? 'y' : 'x'
  const lineStartScreen = isVertical ? XY.$(0, offset) : XY.$(offset, 0)
  const lineEndScreen = isVertical
    ? XY.$(TICK_SIZE, offset)
    : XY.$(offset, TICK_SIZE)
  const lineStart = snapSceneXYToHalfPixel(
    sceneMatrix.invertXY(lineStartScreen),
    sceneMatrix,
    snapAxis,
  )
  const lineEnd = snapSceneXYToHalfPixel(
    sceneMatrix.invertXY(lineEndScreen),
    sceneMatrix,
    snapAxis,
  )
  const snappedOffset = isVertical
    ? sceneMatrix.applyXY(lineStart).y
    : sceneMatrix.applyXY(lineStart).x
  const textOriginScreen = isVertical
    ? XY.$(TICK_SIZE + 2, snappedOffset + TEXT_WIDTH / 2)
    : XY.$(snappedOffset - TEXT_WIDTH / 2, TICK_SIZE + 2)
  const textOrigin = sceneMatrix.invertXY(textOriginScreen)

  const line = schemaCreator.line({
    id: `ruler-${type}-tick-line-${value}`,
    fills: [],
    points: [
      schemaCreator.point({ x: lineStart.x, y: lineStart.y, isStart: true }),
      schemaCreator.point({ x: lineEnd.x, y: lineEnd.y, isEnd: true }),
    ],
    strokes: [
      schemaCreator.stroke({
        fill: schemaCreator.fillColor(RULER_COLOR, 1),
        width: 1 / zoom,
        cap: 'butt',
      }),
    ],
  })
  const text = schemaCreator.text({
    id: `ruler-${type}-tick-text-${value}`,
    content: value.toString(),
    width: TEXT_WIDTH / zoom,
    height: LINE_HEIGHT / zoom,
    matrix: Matrix.identity()
      .rotate(isVertical ? -90 : 0)
      .translate(textOrigin.x, textOrigin.y)
      .plain(),
    style: {
      fontSize: FONT_SIZE / zoom,
      fontWeight: 100,
      align: 'center',
      fontFamily: 'Arial',
      fontStyle: 'normal',
      letterSpacing: 0,
      lineHeight: LINE_HEIGHT / zoom,
    },
    fills: [schemaCreator.fillColor(RULER_COLOR, 1)],
  })

  return (
    <>
      <elem node={line} />
      <elem node={text} />
    </>
  )
})
