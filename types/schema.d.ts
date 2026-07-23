namespace S {
  type IXY = { x: number; y: number }
  type Matrix = import('src/editor/geometry/matrix').IMatrix
  type MRect = import('src/editor/geometry/mrect').IMRect

  type Schema = { meta: Meta; [id: string & {}]: SchemaItem }

  type SchemaItem = Node | Page

  type Meta = {
    type: 'meta'
    id: 'meta'
    fileId: string
    name: string
    pageIds: string[]
    userId: string
    version: number
  }

  type Client = {
    userId: string
    userName: string
    userAvatar: string
    selectIdMap: Record<string, boolean>
    selectPageId: string
    cursor: IXY
    color: string
    sceneMatrix: Matrix
  }

  type Clients = { [clientId: number]: Client }

  type NodeParentBase = { childIds: string[] }

  type Page = NodeParentBase & { type: 'page'; id: `page_${string}`; name: string }

  type NodeParent = Frame | Group | Page

  type Node = Frame | Group | Rectangle | Ellipse | Text | Line | Path

  type NodeMeta = {
    id: string
    name: string
    lock: boolean
    visible: boolean
    parentId: string
    __isNode: true
  }

  type NodeEffect = {
    opacity: number
    flip: 0 | 1 | 2 | 3
    fills: Fill[]
    stroke: Stroke
    blurs: any[]
    shadows: Shadow[]
    outline?: Outline
  }

  type NodeBase = NodeMeta & NodeEffect & MRect

  type Frame = NodeBase & NodeParentBase & { type: 'frame'; radius: number }

  type Group = NodeBase & NodeParentBase & { type: 'group' }

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

  type Vector = Rectangle | Ellipse | Line | Path

  type VectorBase = { points: Point[] }

  type Rectangle = NodeBase &
    VectorBase & { type: 'rect'; radius: number; strokeSide: StrokeSide }

  type Ellipse = NodeBase &
    VectorBase & {
      type: 'ellipse'
      innerRate: number
      startAngle: number
      sweepAngle: number
    }

  type Line = NodeBase & VectorBase & { type: 'line' }

  type Path = NodeBase & VectorBase & { type: 'path' }

  type Text = NodeBase & {
    type: 'text'
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

  type Fill = FillColor | FillLinearGradient | FillImage

  type FillMeta = { visible: boolean; alpha: number }

  type FillColor = FillMeta & { type: 'color'; color: string }

  type FillLinearGradient = FillMeta & {
    type: 'linearGradient'
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
