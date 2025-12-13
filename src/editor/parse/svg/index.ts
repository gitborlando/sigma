import { loopFor } from '@gitborlando/utils'
import { camelCase } from 'nano-string-utils'
import { OperateNode } from 'src/editor/operate/node'
import { SchemaCreator } from 'src/editor/schema/creator'
import { normalizeColor } from 'src/shared/utils/color'
import { IrregularUtils } from 'src/shared/utils/irregular'
import arcToBezier from 'svg-arc-to-cubic-bezier'
import { ElementNode, parse as svgParser } from 'svg-parser'
import svgPathBoundingBox from 'svg-path-bounding-box'
import SvgPathParser from 'svg-path-parser'

type ISvgProps = {
  x?: number
  y?: number
  cx?: number
  cy?: number
  rx?: number
  ry?: number
  r?: number
  width?: number
  height?: number
  viewBox?: string
  d?: string
  points?: string
  fill?: string
  stroke?: string
  strokeWidth?: number
  strokeLinejoin?: string
  strokeLinecap?: string
}

type SvgNode = ElementNode & { properties: ISvgProps }

export class SvgParser {
  private ratio!: IXY
  constructor(
    private svg: string,
    private xy: IXY,
  ) {}

  parse() {
    const svgNode = svgParser(this.svg).children[0] as SvgNode
    return this.parseSvgNode(svgNode, svgNode)
  }

  private parseSvgNode(
    svgNode: SvgNode,
    parentSvgNode: SvgNode,
    parentNode?: INodeParent,
  ) {
    this.camelCaseProps(svgNode.properties)
    this.inheritParentProps(svgNode.properties, parentSvgNode.properties)

    let node!: V1.Node
    const { tagName, properties, children } = svgNode
    const { x, y, cx, cy, r, width, height } = properties

    switch (tagName) {
      case 'svg': {
        const viewBox = properties.viewBox
        let viewBoxArr = <number[]>[]
        if (width === undefined && height === undefined) {
          viewBoxArr = viewBox!.split(' ').map(Number)
          properties.width = viewBoxArr[2]
          properties.height = viewBoxArr[3]
          node = SchemaCreator.frame({
            width: properties.width,
            height: properties.height,
          })
        } else {
          if (viewBox) viewBoxArr = viewBox!.split(' ').map(Number)
          else viewBoxArr = [0, 0, width!, height!]
          node = SchemaCreator.frame({ width, height })
        }
        this.ratio = XY._(
          properties.width! / viewBoxArr[2],
          properties.height! / viewBoxArr[3],
        )
        break
      }
      case 'rect': {
        node = SchemaCreator.rect({ x, y, width, height })
        if (r) node.radius = r
        break
      }
      case 'circle': {
        const [x, y] = [cx! - r!, cy! - r!]
        node = SchemaCreator.ellipse({ x, y, width: r! * 2, height: r! * 2 })
        break
      }
      case 'polyline': {
        node = SchemaCreator.irregular()
        node.points = this.parsePolylineToPoints(properties)
        break
      }
      case 'line': {
        node = SchemaCreator.irregular()
        node.points = this.parseLineToPoints(properties)
        break
      }
      case 'path': {
        const d = properties.d as string
        const { minX, minY, width, height } = svgPathBoundingBox(d)
        node = SchemaCreator.irregular({
          x: minX * this.ratio.x,
          y: minY * this.ratio.y,
          width: width * this.ratio.x,
          height: height * this.ratio.y,
        })
        node.points = this.parseSvgPathToPoints(d)
        const shift = XY._(
          (parentNode as any)!.x - node.x - this.xy.x,
          (parentNode as any)!.y - node.y - this.xy.y,
        )
        node.points.forEach((point) => IrregularUtils.shiftPointXY(point, shift))
        break
      }
    }

    node.x += this.xy.x
    node.y += this.xy.y

    this.parseFill(node, svgNode)
    this.parseStroke(node, svgNode)

    OperateNode.addNodes([node])
    if (parentNode) OperateNode.insertAt(parentNode, node)

    children.forEach((child) => {
      this.parseSvgNode(child as SvgNode, svgNode, node as INodeParent)
    })

    return node as IFrame
  }

  private parseStroke(node: INode, svgNode: SvgNode) {
    const { stroke, strokeWidth, strokeLinejoin, strokeLinecap } = svgNode.properties
    if (!stroke || stroke === 'none' || svgNode.tagName === 'svg') return
    const solidColor = normalizeColor(stroke)
    const strokeColor = SchemaCreator.fillColor(solidColor.color, solidColor.alpha)
    const nodeStroke = SchemaCreator.stroke({
      fill: strokeColor,
      width: strokeWidth! * this.ratio.x,
      join: strokeLinejoin as IStroke['join'],
      cap: strokeLinecap as IStroke['cap'],
    })
    node.strokes = [nodeStroke]
  }

  private parseFill(node: INode, svgNode: SvgNode) {
    node.fills = []
    const { fill } = svgNode.properties
    if (fill && fill !== 'none' && svgNode.tagName !== 'svg') {
      const solidColor = normalizeColor(fill)
      const fillColor = SchemaCreator.fillColor(solidColor.color, solidColor.alpha)
      node.fills = [fillColor]
    }
  }

  private parsePolylineToPoints(properties: ISvgProps) {
    const points = <IPoint[]>[]
    const numbers = properties.points!.split(' ').map(Number)
    for (let i = 0; i < numbers.length - 1; i += 2) {
      const point = SchemaCreator.point({ x: numbers[i], y: numbers[i + 1] })
      if (i === 0) point.startPath = true
      if (i === numbers.length - 2) point.endPath = true
      points.push(point)
    }
    loopFor(points, (cur, next) => {
      if (cur.endPath) next.startPath = true
    })
    return points
  }

  private parseLineToPoints(properties: SvgNode['properties']) {
    const x1 = properties.x1 as number
    const y1 = properties.y1 as number
    const x2 = properties.x2 as number
    const y2 = properties.y2 as number
    const point1 = SchemaCreator.point({ x: x1, y: y1, startPath: true })
    const point2 = SchemaCreator.point({ x: x2, y: y2, endPath: true })
    const points = [point1, point2]
    loopFor(points, (cur, next) => {
      if (cur.endPath) next.startPath = true
    })
    return points
  }

  private parseSvgPathToPoints(svgPath: string) {
    const { parseSVG, makeAbsolute } = SvgPathParser
    const parsed = parseSVG(svgPath)
    const commands = makeAbsolute(parsed)
    const points: IPoint[] = []

    function dealCurvePoint(
      x: number,
      y: number,
      x1: number,
      y1: number,
      x2: number,
      y2: number,
    ) {
      const handleLeft = { x: x2, y: y2 }
      const handleRight = { x: x1, y: y1 }
      const point = SchemaCreator.point({ x, y, handleL: handleLeft })
      points[points.length - 1].handleR = handleRight
      points.push(point)
    }

    commands.forEach((command) => {
      const { x, y } = command
      const prevPoint = points[points.length - 1]

      switch (command.command) {
        case 'moveto':
          points.push(SchemaCreator.point({ x, y, startPath: true }))
          break
        case 'lineto':
        case 'horizontal lineto':
        case 'vertical lineto':
          points.push(SchemaCreator.point({ x, y }))
          break
        case 'curveto':
          const { x1, y1, x2, y2 } = command
          dealCurvePoint(x, y, x1, y1, x2, y2)
          break
        case 'smooth curveto':
          const handleLeft = { x: command.x2, y: command.y2 }
          const handleRight = XY.of(prevPoint.handleL!).symmetric(prevPoint)
          const point = SchemaCreator.point({ x, y, handleL: handleLeft })
          prevPoint.handleR = handleRight
          points.push(point)
          break
        case 'elliptical arc':
          const { x0, y0, rx, ry, xAxisRotation, largeArc, sweep } = command
          const pos = { px: x0, py: y0, cx: x, cy: y, rx, ry }
          const largeArcFlag = largeArc ? 1 : 0
          const sweepFlag = sweep ? 1 : 0
          const bezierCurves = arcToBezier({
            ...pos,
            xAxisRotation,
            largeArcFlag,
            sweepFlag,
          })
          bezierCurves.forEach(({ x, y, x1, y1, x2, y2 }) => {
            dealCurvePoint(x, y, x1, y1, x2, y2)
          })
          break
        case 'closepath':
          prevPoint.endPath = true
          break
      }
    })

    loopFor(points, (cur, next) => {
      if (cur.endPath) next.startPath = true
      IrregularUtils.multiplyPointXY(cur, this.ratio)
    })
    return points
  }

  private inheritParentProps(props: ISvgProps, parentProps: ISvgProps) {
    if (!props.fill) props.fill = parentProps.fill
    if (!props.stroke) props.stroke = parentProps.stroke
    if (!props.strokeWidth) props.strokeWidth = parentProps.strokeWidth || 1
    if (!props.strokeLinejoin)
      props.strokeLinejoin = parentProps.strokeLinejoin || 'round'
    if (!props.strokeLinecap)
      props.strokeLinecap = parentProps.strokeLinecap || 'round'
  }

  private camelCaseProps(obj: Record<string, any>) {
    Object.keys(obj).forEach((key) => {
      if (key.includes('-')) {
        const newKey = camelCase(key)
        obj[newKey] = obj[key]
        delete obj[key]
      }
    })
  }
}
