namespace V1 {
  type IXY = { x: number; y: number }

  type Schema = {
    meta: Meta
    [id: string & {}]: SchemaItem
  }

  type SchemaItem = Node | Page | Meta

  type NodeOrPage = Node | Page

  type Meta = {
    type: 'meta'
    id: 'meta'
    fileId: string
    name: string
    version: `v${number}`
    pageIds: string[]
    userId: string
  }

  type Client = {
    userId: string
    userName: string
    userAvatar: string
    selectIdMap: Record<string, boolean>
    selectPageId: string
    cursor: IXY
    color: string
    sceneMatrix: import('src/editor/math/matrix').IMatrixTuple
  }

  type Clients = {
    [clientId: number]: Client
  }

  type NodeParentBase = {
    childIds: string[]
  }

  type Page = NodeParentBase & {
    type: 'page'
    id: `page_${string}`
    name: string
  }

  type NodeParent = Frame | Group | Page

  type Node =
    | Frame
    | Group
    | Rectangle
    | Ellipse
    | Text
    | Line
    | Polygon
    | Star
    | Path

  type NodeMeta = {
    id: string
    name: string
    lock: boolean
    visible: boolean
    parentId: string
  }

  type OBBInfo = {
    x: number
    y: number
    width: number
    height: number
    rotation: number
  }

  type Transform = [number, number, number, number, number]

  type NodeBase = NodeMeta &
    OBBInfo & {
      transform: Transform
      opacity: number
      flip?: 'x' | 'y' | 'xy'
      fills: Fill[]
      strokes: Stroke[]
      blurs: any[]
      shadows: Shadow[]
      outline?: Outline
    }

  type Frame = NodeBase &
    NodeParentBase & {
      type: 'frame'
      radius: number
    }

  type Group = NodeBase &
    NodeParentBase & {
      type: 'group'
    }

  type Point = {
    type: 'point'
    symmetric: 'angle' | 'complete' | 'none'
    x: number
    y: number
    radius: number
    handleL?: XY
    handleR?: XY
    endPath?: boolean
    startPath?: boolean
  }

  type Vector = Rectangle | Ellipse | Polygon | Star | Line | Path

  type VectorBase = {
    points: Point[]
  }

  type Path = NodeBase &
    VectorBase & {
      type: 'irregular'
    }

  type Rectangle = NodeBase &
    VectorBase & {
      type: 'rect'
      radius: number
    }

  type Ellipse = NodeBase &
    VectorBase & {
      type: 'ellipse'
      innerRate: number
      startAngle: number
      endAngle: number
    }

  type Polygon = NodeBase &
    VectorBase & {
      type: 'polygon'
      sides: number
      radius: number
    }

  type Star = NodeBase &
    VectorBase & {
      type: 'star'
      pointCount: number
      radius: number
      innerRate: number
    }

  type Line = NodeBase &
    VectorBase & {
      type: 'line'
    }

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

  type FillMeta = {
    visible: boolean
    alpha: number
  }

  type FillColor = FillMeta & {
    type: 'color'
    color: string
  }

  type FillLinearGradient = FillMeta & {
    type: 'linearGradient'
    start: XY
    end: XY
    stops: { offset: number; color: string }[]
  }

  type FillImage = FillMeta & {
    type: 'image'
    url: string
    matrix: number[]
  }

  type FillKeys = AllKeys<IFill> | number

  type Stroke = {
    visible: boolean
    width: number
    fill: Fill
    align: 'inner' | 'center' | 'outer'
    cap: CanvasRenderingContext2D['lineCap']
    join: CanvasRenderingContext2D['lineJoin']
  }

  type Shadow = {
    visible: boolean
    offsetX: number
    offsetY: number
    blur: number
    spread: number
    fill: Fill
  }

  type Outline = {
    width: number
    color: string
  }

  type TextDecoration = {
    style: 'none' | 'underline'
    width: number
    color: string
  }
}
