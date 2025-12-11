import { clone, createCache, miniId } from '@gitborlando/utils'
import {
  createLine,
  createRegularPolygon,
  createStarPolygon,
} from 'src/editor/math/point'
import { defuOverrideArray } from 'src/utils/defu'
import { themeColor } from 'src/view/styles/color'

class SchemaCreatorService {
  schema(): V1.Schema {
    const page = this.page()
    const meta = this.meta()
    meta.pageIds = [page.id]
    return {
      meta,
      [page.id]: page,
    }
  }

  meta(): V1.Meta {
    return {
      type: 'meta',
      id: 'meta',
      fileId: '',
      name: t('special.untitled'),
      version: 'v0',
      pageIds: [],
      userId: '',
    }
  }

  page(): V1.Page {
    return {
      type: 'page',
      id: `page_${miniId()}`,
      childIds: [],
      name: this.createNodeName('page'),
    }
  }

  point(option?: Partial<V1.Point>): V1.Point {
    return {
      type: 'point',
      symmetric: 'angle',
      x: 0,
      y: 0,
      radius: 0,
      ...option,
    }
  }

  frame(option?: Partial<V1.Frame>): V1.Frame {
    const nodeBase = this.createNodeBase()
    return {
      type: 'frame',
      radius: 0,
      childIds: [],
      ...nodeBase,
      fills: [this.fillColor(COLOR.white)],
      ...option,
    }
  }

  group(option?: Partial<V1.Group>): V1.Group {
    const nodeBase = this.createNodeBase()
    return {
      type: 'group',
      childIds: [],
      ...nodeBase,
      ...option,
    }
  }

  rect(option?: Partial<V1.Rectangle>): V1.Rectangle {
    const nodeBase = this.createNodeBase()
    return {
      type: 'rect',
      points: [],
      radius: 0,
      ...nodeBase,
      ...option,
    }
  }

  ellipse(option?: Partial<V1.Ellipse>): V1.Ellipse {
    const nodeBase = this.createNodeBase()
    return {
      type: 'ellipse',
      points: [],
      innerRate: 0,
      startAngle: 0,
      endAngle: 360,
      ...nodeBase,
      ...option,
    }
  }

  polygon(option?: Partial<V1.Polygon>): V1.Polygon {
    const nodeBase = this.createNodeBase()
    const { width, height } = option || nodeBase
    const points = createRegularPolygon(width!, height!, option?.sides || 3)
    return {
      type: 'polygon',
      sides: option?.sides || 3,
      radius: 0,
      points,
      ...nodeBase,
      ...option,
    }
  }

  star(option?: Partial<V1.Star>): V1.Star {
    const nodeBase = this.createNodeBase()
    const { width, height } = option || nodeBase
    const points = createStarPolygon(width!, height!, 5, 0.382)
    return {
      type: 'star',
      pointCount: 5,
      radius: 0,
      innerRate: 0.382,
      points,
      ...nodeBase,
      ...option,
    }
  }

  line(option?: Partial<V1.Line>): V1.Line {
    const nodeBase = this.createNodeBase()
    const start = XY._(nodeBase.x, nodeBase.y)
    const length = option?.width || nodeBase.width
    const rotation = option?.rotation || nodeBase.rotation
    const points = createLine(start, length, rotation)
    return {
      type: 'line',
      points,
      ...nodeBase,
      fills: [this.fillColor(COLOR.black, 1)],
      strokes: [this.stroke()],
      ...option,
      height: 0,
    }
  }

  irregular(option?: Partial<V1.Path>): V1.Path {
    const nodeBase = this.createNodeBase()
    return {
      type: 'irregular',
      points: [],
      ...nodeBase,
      ...option,
    }
  }

  image(option?: Partial<V1.Rectangle>): V1.Rectangle {
    const rect = this.rect(option)
    rect.fills.push(this.fillImage(''))
    return rect
  }

  text(option?: NestPartial<V1.Text>): V1.Text {
    const nodeBase = this.createNodeBase()
    return T<V1.Text>(
      defuOverrideArray(
        {
          ...nodeBase,
          ...option,
        },
        {
          type: 'text',
          content: '文本1',
          style: {
            fontSize: 16,
            fontWeight: 500,
            align: 'center',
            fontFamily: 'Arial',
            fontStyle: 'normal',
            letterSpacing: 0,
            lineHeight: 16,
          },
          fills: [this.fillColor(COLOR.black, 1)],
        },
      ),
    )
  }

  fillColor(color = COLOR.gray, alpha = 1): V1.FillColor {
    return { type: 'color', visible: true, color, alpha }
  }

  fillLinearGradient(
    start: IXY = XY._(0, 0),
    end: IXY = XY._(1, 1),
  ): V1.FillLinearGradient {
    return {
      type: 'linearGradient',
      visible: true,
      start,
      end,
      stops: [
        { offset: 0, color: COLOR.blue },
        { offset: 1, color: COLOR.pinkRed },
      ],
      alpha: 1,
    }
  }

  fillImage(
    url: string = Assets.editor.RP.operate.picker.defaultImage,
  ): V1.FillImage {
    return {
      type: 'image',
      visible: true,
      url,
      matrix: [0, 0, 0, 0, 0, 0],
      alpha: 1,
    }
  }

  stroke(option?: Partial<V1.Stroke>) {
    return <V1.Stroke>{
      visible: true,
      fill: this.fillColor(COLOR.black),
      align: 'center',
      width: 1,
      cap: 'round',
      join: 'round',
      ...option,
    }
  }

  solidStroke(color = COLOR.black, width = 1) {
    return this.stroke({
      fill: this.fillColor(color),
      width,
    })
  }

  shadow(option?: Partial<V1.Shadow>): V1.Shadow {
    return <V1.Shadow>{
      visible: true,
      offsetX: 5,
      offsetY: 5,
      blur: 2,
      spread: 2,
      fill: this.fillColor(COLOR.black),
      ...option,
    }
  }

  outline(option?: Partial<V1.Outline>): V1.Outline {
    return {
      color: themeColor(),
      width: 2,
      ...option,
    }
  }

  textDecoration(option?: Partial<V1.TextDecoration>): V1.TextDecoration {
    return {
      style: 'underline',
      color: themeColor(),
      width: 1,
      ...option,
    }
  }

  private createSchemaMeta(): V1.NodeMeta {
    return {
      id: miniId(),
      name: '',
      lock: false,
      visible: true,
      parentId: '',
    }
  }

  private createNodeBase(): V1.NodeBase {
    return {
      ...this.createSchemaMeta(),
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      opacity: 1,
      rotation: 0,
      fills: [this.fillColor()],
      strokes: [],
      blurs: [],
      shadows: [],
      matrix: Matrix.identity().tuple(),
    }
  }

  private nodeNameCache = createCache<string, number>()

  createNodeName(type: string) {
    const index = this.nodeNameCache.getSet(type, () => 0)
    this.nodeNameCache.set(type, index + 1)
    return `${t(`noun.${type}`)} ${index + 1}`
  }

  addToSchema(schema: V1.Schema, item: V1.SchemaItem) {
    schema[item.id] = item
  }

  addChild(parent: V1.NodeParent, child: V1.Node) {
    parent.childIds.push(child.id)
    child.parentId = parent.id
  }

  clone<T extends V1.SchemaItem>(item: T, option?: Partial<T>) {
    const newItem = clone(item)
    newItem.id = miniId()
    if ('childIds' in newItem) newItem.childIds = []
    return defuOverrideArray(option || {}, newItem) as T
  }
}

export const SchemaCreator = new SchemaCreatorService()
