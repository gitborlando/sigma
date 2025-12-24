import { StageSurface } from 'src/editor/render/surface'
import { getZoom, StageViewport } from 'src/editor/stage/viewport'
import { expandOneStep, snapHalfPixel } from 'src/utils/common'

class StageToolGridService {
  private ctx!: CanvasRenderingContext2D

  subscribe() {
    return Disposer.collect(StageSurface.onRenderTopCanvas.hook(this.draw))
  }

  private draw() {
    const zoom = getZoom()
    if (zoom < 10.96) return

    StageSurface.ctxSaveRestore((ctx) => {
      ctx.transform(...StageViewport.sceneMatrix.invert().tuple())
      ctx.strokeStyle = '#cccccc55'
      ctx.lineWidth = 1
      this.ctx = ctx
      this.getTicks().forEach(({ x, y, length }) => {
        this.drawLine('horizontal', { x, y }, length)
        this.drawLine('vertical', { x, y }, length)
      })
    })
  }

  private drawLine(type: 'horizontal' | 'vertical', start: IXY, length: number) {
    start = StageViewport.sceneMatrix.applyXY(start)
    length = length * getZoom()
    const startX = snapHalfPixel(start.x)
    const startY = snapHalfPixel(start.y)

    const path2d = new Path2D()
    path2d.moveTo(startX, startY)
    if (type === 'horizontal') {
      path2d.lineTo(start.x + length, startY)
    } else {
      path2d.lineTo(startX, start.y + length)
    }

    this.ctx.stroke(path2d)
  }

  private getTicks = () => {
    const ticks: { x: number; y: number; length: number }[] = []

    const { minX, minY, maxX, maxY } = StageViewport.sceneAABB

    const hStart = expandOneStep(minX, 1, 'left')
    const hEnd = expandOneStep(maxX, 1, 'right')
    const vStart = expandOneStep(minY, 1, 'left')
    const vEnd = expandOneStep(maxY, 1, 'right')

    for (let i = hStart; i <= hEnd; i += 1) {
      ticks.push({ x: i, y: vStart, length: vEnd - vStart })
    }
    for (let i = vStart; i <= vEnd; i += 1) {
      ticks.push({ x: hStart, y: i, length: hEnd - hStart })
    }

    return ticks
  }
}

export const StageToolGrid = autoBind(makeObservable(new StageToolGridService()))
