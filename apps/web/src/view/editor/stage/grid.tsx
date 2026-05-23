import { SchemaCreator } from 'src/editor/schema/creator'
import { getZoom, StageViewport } from 'src/editor/stage/viewport'
import { rgb } from 'src/utils/color'

const getStepByZoom = (zoom: number) => {
  const steps = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]
  const base = 50 / zoom
  return steps.find((i) => i >= base) || steps[0]
}

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
  const { bound, zoom } = StageViewport

  const getTicks = () => {
    const ticks: { x: number; y: number; length: number }[] = []
    const offset = XY.from(StageViewport.offset).divide(zoom)
    const sceneWidth = bound.width / zoom
    const sceneHeight = bound.height / zoom
    const step = getStepByZoom(zoom)
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
  const line = SchemaCreator.line({
    x,
    y,
    width: length,
    rotation: type === 'horizontal' ? 0 : 45,
    strokes: [SchemaCreator.solidStroke(rgb(204, 204, 204), 0.5 / getZoom())],
  })
  return <elem node={line} />
})
