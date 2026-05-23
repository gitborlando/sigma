import { clone, createCache, miniId } from '@gitborlando/utils'
import {
  createLine,
  createRegularPolygon,
  createStarPolygon,
} from 'src/editor/math/point'
import { defuOverrideArray } from 'src/utils/defu'
import { themeColor } from 'src/view/styles/color'

class SchemaCreatorService {
  schema(): S.Schema {
    const page = this.page()
    const meta = this.meta()
    meta.pageIds = [page.id]
    return {
      meta,
      [page.id]: page,
    }
  }

  meta(): S.Meta {
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

  page(): S.Page {
    return {
      type: 'page',
      id: `page_${miniId()}`,
      childIds: [],
      name: this.createNodeName('page'),
    }
  }

  point(option?: Partial<S.Point>): S.Point {
    return {
      type: 'point',
      symmetric: 'angle',
      x: 0,
      y: 0,
      radius: 0,
      ...option,
    }
  }

  frame(option?: Partial<S.Frame>): S.Frame {
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

  group(option?: Partial<S.Group>): S.Group {
    const nodeBase = this.createNodeBase()
    return {
      type: 'group',
      childIds: [],
      ...nodeBase,
      ...option,
    }
  }

  rect(option?: Partial<S.Rectangle>): S.Rectangle {
    const nodeBase = this.createNodeBase()
    return {
      type: 'rect',
      points: [],
      radius: 0,
      ...nodeBase,
      ...option,
    }
  }

  ellipse(option?: Partial<S.Ellipse>): S.Ellipse {
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

  polygon(option?: Partial<S.Polygon>): S.Polygon {
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

  star(option?: Partial<S.Star>): S.Star {
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

  line(option?: Partial<S.Line>): S.Line {
    const nodeBase = this.createNodeBase()
    const start = XY.$(nodeBase.x, nodeBase.y)
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

  irregular(option?: Partial<S.Path>): S.Path {
    const nodeBase = this.createNodeBase()
    return {
      type: 'irregular',
      points: [],
      ...nodeBase,
      ...option,
    }
  }

  image(option?: Partial<S.Rectangle>): S.Rectangle {
    const rect = this.rect(option)
    rect.fills.push(this.fillImage(''))
    return rect
  }

  text(option?: NestPartial<S.Text>): S.Text {
    const nodeBase = this.createNodeBase()
    return T<S.Text>(
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

  fillColor(color = COLOR.gray, alpha = 1): S.FillColor {
    return { type: 'color', visible: true, color, alpha }
  }

  fillLinearGradient(
    start: IXY = XY.$(0, 0),
    end: IXY = XY.$(1, 1),
  ): S.FillLinearGradient {
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
  ): S.FillImage {
    return {
      type: 'image',
      visible: true,
      url,
      matrix: [0, 0, 0, 0, 0, 0],
      alpha: 1,
    }
  }

  stroke(option?: Partial<S.Stroke>) {
    return <S.Stroke>{
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

  shadow(option?: Partial<S.Shadow>): S.Shadow {
    return <S.Shadow>{
      visible: true,
      offsetX: 5,
      offsetY: 5,
      blur: 2,
      spread: 2,
      fill: this.fillColor(COLOR.black),
      ...option,
    }
  }

  outline(option?: Partial<S.Outline>): S.Outline {
    return {
      color: themeColor(),
      width: 2,
      ...option,
    }
  }

  textDecoration(option?: Partial<S.TextDecoration>): S.TextDecoration {
    return {
      style: 'underline',
      color: themeColor(),
      width: 1,
      ...option,
    }
  }

  private createSchemaMeta(): S.NodeMeta {
    return {
      id: miniId(),
      name: '',
      lock: false,
      visible: true,
      parentId: '',
    }
  }

  private createNodeBase(): S.NodeBase {
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
      matrix: Matrix.identity(),
    }
  }

  private nodeNameCache = createCache<string, number>()

  createNodeName(type: string) {
    const index = this.nodeNameCache.getSet(type, () => 0)
    this.nodeNameCache.set(type, index + 1)
    return `${t(`noun.${type}`)} ${index + 1}`
  }

  addToSchema(schema: S.Schema, item: S.SchemaItem) {
    schema[item.id] = item
  }

  addChild(parent: S.NodeParent, child: S.Node) {
    parent.childIds.push(child.id)
    child.parentId = parent.id
  }

  clone<T extends S.SchemaItem>(item: T, option?: Partial<T>) {
    const newItem = clone(item)
    newItem.id = miniId()
    if ('childIds' in newItem) newItem.childIds = []
    return defuOverrideArray(option || {}, newItem) as T
  }
}

export const SchemaCreator = new SchemaCreatorService()
