import { expandOneStep, snapSceneXYToHalfPixel } from 'src/editor/utils/misc'
import { rgba } from 'src/utils/color'
import { useEditorServices } from 'src/view/hooks/editor'

export const StageGridComp: FC<{}> = observer(({}) => {
  const { stageViewport } = useEditorServices()
  if (stageViewport.zoom < 10.96) return null

  return (
    <>
      <Lines type='horizontal' />
      <Lines type='vertical' />
    </>
  )
})

export const Lines: FC<{ type: 'horizontal' | 'vertical' }> = observer(
  ({ type }) => {
    const { stageViewport } = useEditorServices()

    const getTicks = () => {
      const ticks: { x: number; y: number; length: number }[] = []
      const { minX, minY, maxX, maxY } = stageViewport.sceneAABB
      const hStart = expandOneStep(minX, 1, 'left')
      const hEnd = expandOneStep(maxX, 1, 'right')
      const vStart = expandOneStep(minY, 1, 'left')
      const vEnd = expandOneStep(maxY, 1, 'right')

      if (type === 'horizontal') {
        for (let i = vStart; i <= vEnd; i += 1) {
          ticks.push({ x: hStart, y: i, length: hEnd - hStart })
        }
      } else {
        for (let i = hStart; i <= hEnd; i += 1) {
          ticks.push({ x: i, y: vStart, length: vEnd - vStart })
        }
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
  },
)

const Line: FC<{
  type: 'horizontal' | 'vertical'
  x: number
  y: number
  length: number
}> = observer(({ type, x, y, length }) => {
  const { schemaCreator, stageViewport } = useEditorServices()
  const zoom = stageViewport.zoom
  const axis = type === 'horizontal' ? 'y' : 'x'
  const end = type === 'horizontal' ? XY.$(x + length, y) : XY.$(x, y + length)
  const start = snapSceneXYToHalfPixel(XY.$(x, y), stageViewport.sceneMatrix, axis)
  const snappedEnd = snapSceneXYToHalfPixel(end, stageViewport.sceneMatrix, axis)
  const line = schemaCreator.line({
    fills: [],
    points: [
      schemaCreator.point({ x: start.x, y: start.y, isStart: true }),
      schemaCreator.point({ x: snappedEnd.x, y: snappedEnd.y, isEnd: true }),
    ],
    stroke: schemaCreator.solidStroke(rgba(204, 204, 204, 0.33), 1 / zoom),
  })

  return <elem node={line} />
})
