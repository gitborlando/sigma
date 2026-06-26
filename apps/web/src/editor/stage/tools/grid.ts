import { Disposer } from '@gitborlando/toolkit/disposer'
import { EditorService } from 'src/editor/service'
import { getZoom } from 'src/editor/utils/get'
import { expandOneStep, snapHalfPixel } from 'src/editor/utils/misc'

export class StageToolGridService extends EditorService {
  private ctx!: CanvasRenderingContext2D

  subscribe() {
    return Disposer.combine(
      this.editor.stageSurface.onRenderTopCanvas.hook(this.draw),
    )
  }

  private draw() {
    const zoom = getZoom(this.editor)
    if (zoom < 10.96) return

    this.editor.stageSurface.ctxSaveRestore((ctx) => {
      ctx.transform(...this.editor.stageViewport.sceneMatrix.invert().tuple())
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
    start = this.editor.stageViewport.sceneMatrix.applyXY(start)
    length = length * getZoom(this.editor)
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

    const { minX, minY, maxX, maxY } = this.editor.stageViewport.sceneAABB

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
