import { rgb } from 'src/utils/color'
import { useEditorServices } from 'src/view/hooks/editor'

const getNearestIntMultiple = (number: number, rate: number) => {
  const n = Math.floor(number / rate)
  const left = rate * n
  const right = rate * (n + 1)
  return number - left <= right - number ? left : right
}

export const EditorStageGridComp: FC<{}> = observer(({}) => {
  return (
    <>
      <Lines type='horizontal' />
      <Lines type='vertical' />
    </>
  )
})

export const Lines: FC<{
  type: 'horizontal' | 'vertical'
}> = observer(({ type }) => {
  const { stageViewport } = useEditorServices()
  const { bound, offset: offsetXY, zoom } = stageViewport

  const getTicks = () => {
    const ticks: { x: number; y: number; length: number }[] = []
    const offset = XY.of(offsetXY).divide(zoom, zoom)
    const sceneWidth = bound.width / zoom
    const sceneHeight = bound.height / zoom
    const step = stageViewport.getStepByZoom(zoom)
    const hStart = getNearestIntMultiple(-offset.x, step)
    const hEnd = getNearestIntMultiple(sceneWidth - offset.x, step)
    const vStart = getNearestIntMultiple(-offset.y, step)
    const vEnd = getNearestIntMultiple(sceneHeight - offset.y, step)
    for (let i = hStart - step * 3; i <= hEnd + step * 3; i += step) {
      ticks.push({ x: i, y: vStart - step * 3, length: sceneHeight + step * 10 })
    }
    for (let i = vStart - step * 3; i <= vEnd + step * 3; i += step) {
      ticks.push({ x: hStart - step * 3, y: i, length: sceneWidth + step * 10 })
    }
    return ticks
  }

  return (
    <>
      {getTicks().map(({ x, y, length }, index) => (
        <Line key={x + y + type + index} type={type} x={x} y={y} length={length} />
      ))}
    </>
  )
})

const Line: FC<{
  type: 'horizontal' | 'vertical'
  x: number
  y: number
  length: number
}> = observer(({ type, x, y, length }) => {
  const { schemaCreator, stageViewport } = useEditorServices()
  const zoom = stageViewport.zoom

  const line = schemaCreator.line({
    x,
    y,
    width: length,
    rotation: type === 'horizontal' ? 0 : 45,
    strokes: [schemaCreator.solidStroke(rgb(204, 204, 204), 0.5 / zoom)],
  })
  return <elem node={line} />
})
