import { AABB, type IXY } from '@gitborlando/geo'
import { getSet, iife, loopFor } from '@gitborlando/utils'
import { clamp } from 'es-toolkit'
import { Setting } from 'src/editor/core/setting'
import { HitTest, Matrix } from 'src/editor/geometry'
import { pointsOnBezierCurves } from 'src/editor/geometry/bezier/points-of-bezier'
import { ISplitText, TextBreaker } from 'src/editor/render/text-break/text-breaker'
import { RenderTree } from 'src/editor/render/tree'
import { StageViewport } from 'src/editor/stage/viewport'
import { Service } from 'src/global/service'
import { Image } from 'src/global/service/image'
import { rgba } from 'src/utils/color'
import { themeColor } from 'src/view/styles/color'
import { Elem } from './elem'

const dpr = devicePixelRatio

@reflection
export class ElemDrawer extends Service {
  private node!: S.Node
  private elem!: Elem
  private ctx!: CanvasRenderingContext2D
  private path2d!: Path2D

  constructor(
    private readonly setting: Setting,
    private readonly stageViewport: StageViewport,
    private readonly renderTree: RenderTree,
  ) {
    super()
    autoBind(this)
  }

  private textBreaker?: TextBreaker

  setTextBreaker(textBreaker: TextBreaker) {
    this.textBreaker = textBreaker
  }

  draw = (elem: Elem, ctx: CanvasRenderingContext2D, path2d: Path2D) => {
    this.node = elem.node
    this.elem = elem
    this.ctx = ctx
    this.path2d = path2d

    this.drawShapePath()

    this.node.fills.forEach((fill, i) => {
      this.ctx.save()
      this.drawShadow(this.node.shadows[i])
      this.drawFill(fill)
      this.ctx.restore()
    })

    this.node.stroke.fills.forEach((fill, i) => {
      this.ctx.save()
      this.drawShadow(this.node.shadows[i])
      this.drawStroke(this.node.stroke, fill)
      this.ctx.restore()
    })

    // this.drawOutline()
    this.drawTextDecoration()
    this.updateHitTest()

    elem.cachePaintRect(this.measurePaintRect(elem))
  }

  measurePaintRect = (elem: Elem) => {
    this.node = elem.node
    this.elem = elem
    const shapeBounds = this.getShapeBounds()
    const paintBounds = [shapeBounds]

    this.node.fills.forEach((_, i) => {
      const shadowBounds = this.getShadowBounds(this.node.shadows[i], shapeBounds)
      if (shadowBounds) paintBounds.push(shadowBounds)
    })

    const { stroke } = this.node
    if (stroke.visible && stroke.fills.some((fill) => fill.visible)) {
      const strokeBounds = this.getStrokeBounds(shapeBounds, stroke)
      stroke.fills.forEach((fill, i) => {
        if (!fill.visible) return
        const shadowBounds = this.getShadowBounds(this.node.shadows[i], strokeBounds)
        if (shadowBounds) paintBounds.push(shadowBounds)
      })
      paintBounds.push(strokeBounds)
    }

    const antialiasPadding = 1 / (dpr * this.stageViewport.zoom)
    return AABB.extend(AABB.merge(paintBounds), antialiasPadding)
  }

  private getShapeBounds = () => {
    const shapeBounds = [this.elem.aabb]
    if (this.node.type !== 'text') return AABB.merge(shapeBounds)

    this.breakText()
    const { width, height, style } = this.node
    const { lineHeight } = style
    const dirtyHeight = lineHeight * this.splitTexts.length
    const minX = Math.min(0, ...this.splitTexts.map(({ start }) => start))
    const maxX = Math.max(
      width,
      ...this.splitTexts.map(({ start, width }) => start + width),
    )
    shapeBounds.push(
      Matrix.of(this.elem.globalMatrix).applyAABB(
        new AABB(minX, -lineHeight / 2, maxX, Math.max(height, dirtyHeight)),
      ),
    )
    return AABB.merge(shapeBounds)
  }

  private drawShapePath = () => {
    const node = this.node
    const { width, height } = node

    switch (node.type) {
      case 'frame':
      case 'rect':
        this.drawRoundRect(width, height, node.radius)
        break

      case 'ellipse':
        this.drawEllipse()
        break

      case 'path':
      case 'line':
        this.drawPath(node.points)
        break

      case 'text':
        this.breakText()
        const { fontWeight, fontSize, fontFamily, letterSpacing } = node.style
        this.ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
        this.ctx.textBaseline = 'top'
        this.ctx.letterSpacing = `${letterSpacing}px`
        break
    }
  }

  private drawRoundRect = (width: number, height: number, radius: number) => {
    if (radius === 0) {
      this.path2d.rect(0, 0, width, height)
    } else {
      this.path2d.roundRect(0, 0, width, height, radius)
    }
  }

  private drawEllipse = () => {
    const {
      width,
      height,
      startAngle,
      sweepAngle: rawSweepAngle,
      innerRate: rawInnerRate,
    } = this.node as S.Ellipse
    const innerRate = clamp(rawInnerRate, 0, 1)
    const sweepAngle = clamp(rawSweepAngle, -360, 360)
    const endAngle = startAngle + sweepAngle
    const anticlockwise = sweepAngle < 0
    const isFullEllipse = Math.abs(sweepAngle) === 360
    const [cx, cy] = [width / 2, height / 2]
    const startRadian = Angle.radianFy(startAngle)
    const endRadian = Angle.radianFy(endAngle)
    const appendEllipse = (
      radiusRate: number,
      start: number,
      end: number,
      reverse = anticlockwise,
    ) =>
      this.path2d.ellipse(
        cx,
        cy,
        cx * radiusRate,
        cy * radiusRate,
        0,
        start,
        end,
        reverse,
      )

    appendEllipse(1, startRadian, endRadian)

    if (innerRate === 0) {
      if (!isFullEllipse) this.path2d.lineTo(cx, cy)
      this.path2d.closePath()
      return
    }

    if (isFullEllipse)
      this.path2d.moveTo(
        cx + Math.cos(startRadian) * cx * innerRate,
        cy + Math.sin(startRadian) * cy * innerRate,
      )

    appendEllipse(
      innerRate,
      isFullEllipse ? startRadian : endRadian,
      isFullEllipse ? endRadian : startRadian,
      !anticlockwise,
    )

    this.path2d.closePath()
  }

  private drawPath(points: S.Point[]) {
    loopFor(points, (cur, next, last, i) => {
      if (cur.isEnd) {
        return this.path2d.closePath()
      }
      if (cur.isStart) {
        this.path2d.moveTo(cur.x, cur.y)
      }
      if (cur.out && next.in) {
        this.path2d.bezierCurveTo(
          cur.out.x,
          cur.out.y,
          next.in.x,
          next.in.y,
          next.x,
          next.y,
        )
      } else if (cur.out) {
        this.path2d.quadraticCurveTo(cur.out.x, cur.out.y, next.x, next.y)
      } else if (next.in) {
        this.path2d.quadraticCurveTo(next.in.x, next.in.y, cur.x, cur.y)
      } else if (!next.isStart) {
        this.path2d.lineTo(next.x, next.y)
      }
    })
  }

  private splitTextsCache = new Map<string, ISplitText[]>()
  private splitTexts!: ISplitText[]

  private breakText() {
    const { content, style, width } = this.node as S.Text
    const { letterSpacing } = style

    this.splitTexts = getSet(
      this.splitTextsCache,
      this.node.id,
      () => {
        if (!this.textBreaker) throw new Error('TextBreaker not initialized')
        return this.textBreaker.breakText(content, width, style, letterSpacing)
      },
      [content, width, style],
    )
  }

  private fillOrStrokeText = (op: 'fillText' | 'strokeText') => {
    const { style } = this.node as S.Text
    const { lineHeight } = style

    this.splitTexts.forEach(({ text, start, width }, i) => {
      if (this.setting.ignoreUnVisible) {
        const visualWidth = width * this.stageViewport.zoom
        const visualHeight = lineHeight * this.stageViewport.zoom
        if (visualWidth / text.length < 2.5 || visualHeight < 2.5) {
          this.ctx.fillRect(start, i * lineHeight, width, lineHeight * 0.2)
          return
        }
      }

      this.ctx[op](text, start, i * lineHeight)
    })
  }

  private drawFill = (fill: S.Fill) => {
    if (!fill.visible) {
      this.ctx.fillStyle = rgba(0, 0, 0, 0.0001)
      return this.ctx.fill(this.path2d)
    }

    this.ctx.globalAlpha = fill.alpha

    const makeFill = () => {
      if (this.node.type === 'text') {
        this.fillOrStrokeText('fillText')
      } else {
        this.ctx.fill(this.path2d, 'evenodd')
      }
    }

    switch (fill.type) {
      case 'color':
        this.ctx.fillStyle = fill.color
        makeFill()
        break

      case 'linearGradient':
        const start = XY.$(
          fill.start.x * this.node.width,
          fill.start.y * this.node.height,
        )
        const end = XY.$(fill.end.x * this.node.width, fill.end.y * this.node.height)

        const gradient = this.ctx.createLinearGradient(
          start.x,
          start.y,
          end.x,
          end.y,
        )
        fill.stops.forEach(({ offset, color }) =>
          gradient.addColorStop(offset, color),
        )

        this.ctx.fillStyle = gradient
        makeFill()
        break

      case 'image':
        const image = Image.getImage(fill.url)
        if (!image) {
          Image.getImageAsync(fill.url).then(() => this.elem.dirty())
        } else {
          const { width, height } = this.node
          const rate = iife(() => {
            if (image.width === 0 || image.height === 0) return 1
            const rateW = width / image.width
            const rateH = height / image.height
            return Math.max(rateW, rateH)
          })
          const path2d = new Path2D(this.path2d)
          this.ctx.clip(path2d)
          this.ctx.drawImage(
            image.image,
            0,
            0,
            width / rate,
            height / rate,
            0,
            0,
            width,
            height,
          )
        }
        break
    }
  }

  private drawStroke = (stroke: S.Stroke, fill: S.Fill) => {
    if (!stroke.visible || !fill.visible) return

    this.ctx.lineWidth = stroke.width
    this.ctx.lineCap = stroke.cap
    this.ctx.lineJoin = stroke.join

    this.ctx.globalAlpha = fill.alpha

    switch (fill.type) {
      case 'color':
        this.ctx.strokeStyle = fill.color
        this.ctx.stroke(this.path2d)
        break

      default:
        break
    }
  }

  private getStrokeBounds(shapeBounds: AABB, stroke: S.Stroke) {
    if (!stroke.visible) return shapeBounds

    const { a, b, c, d } = this.elem.globalMatrix
    const scale = Math.max(Math.hypot(a, b), Math.hypot(c, d))
    const expand = stroke.width * scale * (stroke.align === 'outer' ? 1 : 0.5)
    return AABB.extend(shapeBounds, expand)
  }

  private drawShadow = (shadow?: S.Shadow) => {
    if (!shadow?.visible) return

    const { fill } = shadow
    const offsetX = shadow.offsetX * this.stageViewport.zoom
    const offsetY = shadow.offsetY * this.stageViewport.zoom
    const blur = shadow.blur * this.stageViewport.zoom

    this.ctx.shadowColor = (fill as S.FillColor).color
    this.ctx.shadowBlur = blur
    this.ctx.shadowOffsetX = offsetX
    this.ctx.shadowOffsetY = offsetY
  }

  private getShadowBounds = (shadow: S.Shadow | undefined, baseBounds: AABB) => {
    if (!shadow?.visible) return

    const offsetX = shadow.offsetX * this.stageViewport.zoom
    const offsetY = shadow.offsetY * this.stageViewport.zoom
    const blur = shadow.blur * this.stageViewport.zoom
    const canvasToScene = 1 / (dpr * this.stageViewport.zoom)
    const sceneOffsetX = offsetX * canvasToScene
    const sceneOffsetY = offsetY * canvasToScene
    const sceneBlur = blur * canvasToScene
    return new AABB(
      baseBounds.minX + sceneOffsetX - sceneBlur,
      baseBounds.minY + sceneOffsetY - sceneBlur,
      baseBounds.maxX + sceneOffsetX + sceneBlur,
      baseBounds.maxY + sceneOffsetY + sceneBlur,
    )
  }

  private drawOutline = () => {
    if (!this.node.outline) return

    const { width, color } = this.node.outline
    if (width <= 0) return

    this.ctx.save()
    this.ctx.lineWidth = width
    this.ctx.strokeStyle = color || themeColor()
    this.ctx.stroke(new Path2D(this.path2d))
    this.ctx.restore()
  }

  private drawTextDecoration() {
    if (this.node.type !== 'text') return
    if (!this.node.style.decoration) return

    const { style, color, width } = this.node.style.decoration
    if (!style || style === 'none' || width <= 0) return

    const collideXys = this.getTextCollideXys()
    const { fontSize } = (this.node as S.Text).style

    for (let i = 0; i < collideXys.length; i += 2) {
      const p1 = collideXys[i]
      const p2 = collideXys[i + 1]
      this.path2d.moveTo(p1.x, p1.y + fontSize / 2)
      this.path2d.lineTo(p2.x, p2.y + fontSize / 2)
    }

    this.ctx.save()
    this.ctx.lineWidth = width
    this.ctx.strokeStyle = color || themeColor()
    this.ctx.stroke(new Path2D(this.path2d))
    this.ctx.restore()
  }

  private updateHitTest = () => {
    const { width, height } = this.elem.mrect

    switch (this.node.type) {
      case 'frame':
      case 'rect':
        const radius = 'radius' in this.node ? this.node.radius : 0
        this.elem.hitTest = HitTest.hitRoundRect(width, height, radius)
        break

      case 'ellipse':
        const { startAngle, sweepAngle, innerRate } = this.node
        this.elem.hitTest = HitTest.hitEllipse(
          width / 2,
          height / 2,
          width / 2,
          height / 2,
          startAngle,
          sweepAngle,
          innerRate,
        )
        break

      case 'path':
      case 'line':
        const { points, stroke } = this.node
        this.elem.eventHandle.cacheHitTest(() => {
          if (this.node.type === 'line') {
            return this.createPolylineHitTest([points], stroke)
          }
          return this.createPathHitTest(stroke)
        }, [points, stroke])
        break

      case 'text': {
        const { content, style, width } = this.node
        this.elem.eventHandle.cacheHitTest(
          () => HitTest.hitPolyline(this.getTextCollideXys(), style.lineHeight),
          [content, style, width],
        )
        break
      }
    }
  }

  private createPolylineHitTest(polylines: IXY[][], stroke: S.Stroke) {
    if (
      !stroke.visible ||
      stroke.width <= 0 ||
      !stroke.fills.some((fill) => fill.visible)
    )
      return () => false

    const hitTests = polylines
      .filter((xys) => xys.length > 1)
      .map((xys) => HitTest.hitPolyline(xys, stroke.width * 2))

    return (xy: IXY) => hitTests.some((hitTest) => hitTest(xy))
  }

  private createPathHitTest(stroke: S.Stroke) {
    const { polylines, polygons } = this.getPathCollideInfo()
    const strokeHitTest = this.createPolylineHitTest(polylines, stroke)
    const polygonHitTests = polygons
      .filter((xys) => xys.length > 2)
      .map((xys) => HitTest.hitPolygon(xys))

    return (xy: IXY) => {
      if (strokeHitTest(xy)) return true
      return polygonHitTests.some((hitTest) => hitTest(xy))
    }
  }

  private getPathCollideInfo() {
    const points = (this.node as S.Path).points
    const polylines = <IXY[][]>[]
    const polygons = <IXY[][]>[]
    let contour = <IXY[]>[]

    const pushContour = (closed = false) => {
      if (contour.length < 2) {
        contour = []
        return
      }
      if (closed) {
        polygons.push(contour)
        polylines.push([...contour, contour[0]])
      } else {
        polylines.push(contour)
      }
      contour = []
    }

    points.forEach((cur, i) => {
      if (i === 0 || cur.isStart || contour.length === 0) contour = [XY.of(cur)]
      if (cur.isEnd) return pushContour(true)

      const next = points[i + 1]
      if (!next || next.isStart) return pushContour()

      contour.push(...this.getPathSegmentCollideXys(cur, next).slice(1))
    })

    pushContour()
    return { polylines, polygons }
  }

  private getPathSegmentCollideXys(cur: S.Point, next: S.Point) {
    if (cur.out && next.in) {
      return pointsOnBezierCurves([cur, cur.out, next.in, next], 0.3, 0.3)
    }
    if (cur.out) {
      return pointsOnBezierCurves([cur, cur.out, next, next], 0.3, 0.3)
    }
    if (next.in) {
      return pointsOnBezierCurves([cur, cur, next.in, next], 0.3, 0.3)
    }
    return [XY.of(cur), XY.of(next)]
  }

  private getTextCollideXys() {
    const collideXys = <IXY[]>[]
    const { lineHeight, fontSize } = (this.node as S.Text).style

    this.splitTexts.forEach(({ start, width }, i) => {
      const y = i * lineHeight + fontSize / 2
      collideXys.push(XY.$(start, y), XY.$(start + width, y))
    })

    return collideXys
  }
}
