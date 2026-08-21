namespace S {
  type IXY = { x: number; y: number }
  type Matrix = import('src/editor/geometry/matrix').IMatrix
  type MRect = import('src/editor/geometry/mrect').IMRect

  type Doc = { meta: Meta; graphs: Record<string, Graph> }

  type Meta = {
    type: 'design'
    id: string
    version: number
    name: string
    pageIds: string[]
    userId: string
  }

  type GraphLike = { id: string; name: string; parentId: string } & MRect

  type Graph = Page | Node

  type ParentLike = { childIds: string[] }

  type Parent = Extract<Graph, ParentLike>

  type Page = GraphLike & ParentLike & { type: 'page' }

  type Node = Frame | Group | Rect | Ellipse | Line | Path | Text

  type Point = {
    id: string
    type: 'point'
    symmetric: 'angle' | 'complete' | 'none'
    x: number
    y: number
    radius: number
    in?: IXY
    out?: IXY
    isStart?: boolean
    isEnd?: boolean
  }

  type NodeMeta = GraphLike & { type: 'node'; lock: boolean; visible: boolean }

  type NodeEffect = {
    opacity: number
    /** 0: none, 1: horizontal, 2: vertical, 3: both */
    flip: 0 | 1 | 2 | 3
    fills: Fill[]
    stroke: Stroke
    blurs: any[]
    shadows: Shadow[]
    outline?: Outline
  }

  type NodeLike = NodeMeta & NodeEffect

  type Frame = NodeLike &
    ParentLike & { variant: 'frame'; radius: number; strokeSide: StrokeSide }

  type Group = NodeLike & ParentLike & { variant: 'group' }

  type VectorLike = { points: Point[] }

  type Vector = Extract<Node, VectorLike>

  type Rect = NodeLike & { variant: 'rect'; radius: number; strokeSide: StrokeSide }

  type Ellipse = NodeLike & {
    variant: 'ellipse'
    innerRate: number
    startAngle: number
    sweepAngle: number
  }

  type Line = NodeLike & VectorLike & { variant: 'line' }

  type Path = NodeLike & VectorLike & { variant: 'path' }

  type Text = NodeLike & {
    variant: 'text'
    content: string
    style: {
      align: 'left' | 'center' | 'right'
      fontFamily: string | string[]
      fontSize: number
      fontStyle: 'normal' | 'italic' | 'oblique'
      fontWeight: 'normal' | 'bold' | 'bolder' | 'lighter' | number
      letterSpacing: number
      lineHeight: number
      decoration?: TextDecoration
    }
  }

  type Fill = FillColor | FillLinear | FillImage

  type FillMeta = { visible: boolean; alpha: number }

  type FillColor = FillMeta & { type: 'color'; color: string }

  type FillLinear = FillMeta & {
    type: 'linear'
    start: IXY
    end: IXY
    stops: { offset: number; color: string }[]
  }

  type FillImage = FillMeta & { type: 'image'; url: string; matrix: number[] }

  type Stroke = {
    visible: boolean
    width: number
    align: 'inner' | 'center' | 'outer'
    fills: Fill[]
    style: 'solid' | 'dashed'
    dash: number
    gap: number
    cap: CanvasRenderingContext2D['lineCap']
    join: CanvasRenderingContext2D['lineJoin']
  }

  type StrokeSide =
    | { type: 'all' | 'top' | 'bottom' | 'left' | 'right' }
    | { type: 'custom'; top: number; bottom: number; left: number; right: number }

  type Shadow = {
    visible: boolean
    offsetX: number
    offsetY: number
    blur: number
    spread: number
    fill: Fill
  }

  type Outline = { width: number; color: string }

  type TextDecoration = { style: 'none' | 'underline'; width: number; color: string }
}
