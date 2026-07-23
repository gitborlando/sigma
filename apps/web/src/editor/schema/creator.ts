import { XY } from '@gitborlando/geo'
import { clone, getSet, miniId } from '@gitborlando/utils'
import { MRect } from 'src/editor/geometry'
import { createLine } from 'src/editor/geometry/point'
import { getLatestVersion } from 'src/editor/schema/migration'
import { Service } from 'src/global/service'
import { COLOR } from 'src/utils/color'
import { T } from 'src/utils/common'
import { mergeOverrideArray } from 'src/utils/export'
import { t } from 'src/view/i18n/config'
import { themeColor } from 'src/view/styles/color'

@reflection
export class SchemaCreator extends Service {
  constructor() {
    super()
    autoBind(this)
  }

  schema(): S.Schema {
    const page = this.page()
    const meta = this.meta()
    meta.pageIds = [page.id]
    return Object.assign({ meta }, { [page.id]: page })
  }

  meta(): S.Meta {
    return {
      type: 'meta',
      id: 'meta',
      fileId: '',
      name: t('untitled'),
      version: getLatestVersion(),
      pageIds: [],
      userId: '',
    }
  }

  page(): S.Page {
    return {
      type: 'page',
      id: `page_${miniId(8)}`,
      childIds: [],
      name: this.createNodeName('page'),
    }
  }

  point(option?: Partial<S.Point>): S.Point {
    return {
      id: miniId(),
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
    return { type: 'group', childIds: [], ...nodeBase, ...option }
  }

  rect(option?: Partial<S.Rectangle>): S.Rectangle {
    const nodeBase = this.createNodeBase()
    return {
      type: 'rect',
      points: [],
      radius: 0,
      strokeSide: { type: 'all' },
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
      sweepAngle: 360,
      ...nodeBase,
      ...option,
    }
  }

  line(option?: Partial<S.Line>): S.Line {
    const nodeBase = this.createNodeBase()
    const start = XY.$(nodeBase.matrix.tx, nodeBase.matrix.ty)
    const length = option?.width || nodeBase.width
    const points = createLine(start, length)
    return {
      type: 'line',
      points,
      ...nodeBase,
      fills: [this.fillColor(COLOR.black, 1)],
      stroke: this.stroke(),
      ...option,
      height: 0,
    }
  }

  path(option?: Partial<S.Path>): S.Path {
    const nodeBase = this.createNodeBase()
    return { type: 'path', points: [], ...nodeBase, ...option }
  }

  image(option?: Partial<S.Rectangle>): S.Rectangle {
    const rect = this.rect(option)
    rect.fills.push(this.fillImage(''))
    return rect
  }

  text(option?: NestPartial<S.Text>): S.Text {
    const nodeBase = this.createNodeBase()
    return T<S.Text>(
      mergeOverrideArray(
        {
          ...nodeBase,
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
        { ...option },
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

  fillImage(url: string): S.FillImage {
    return {
      type: 'image',
      visible: true,
      url,
      matrix: [0, 0, 0, 0, 0, 0],
      alpha: 1,
    }
  }

  stroke(option?: Partial<S.Stroke>): S.Stroke {
    return {
      visible: true,
      fills: [this.fillColor(COLOR.black)],
      align: 'center',
      width: 1,
      cap: 'round',
      join: 'round',
      ...option,
    }
  }

  solidStroke(color = COLOR.black, width = 1) {
    return this.stroke({ fills: [this.fillColor(color)], width })
  }

  shadow(option?: Partial<S.Shadow>): S.Shadow {
    return {
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
    return { color: themeColor(), width: 2, ...option }
  }

  textDecoration(option?: Partial<S.TextDecoration>): S.TextDecoration {
    return { style: 'underline', color: themeColor(), width: 1, ...option }
  }

  private createSchemaMeta(): S.NodeMeta {
    return {
      id: miniId(8),
      name: '',
      lock: false,
      visible: true,
      parentId: '',
      __isNode: true,
    }
  }

  private createNodeBase(): S.NodeBase {
    return {
      ...this.createSchemaMeta(),
      ...MRect.identity(100, 100).plain(),
      opacity: 1,
      flip: 0,
      fills: [this.fillColor()],
      stroke: this.stroke(),
      blurs: [],
      shadows: [],
    }
  }

  private nodeNameCache = new Map<string, number>()

  createNodeName(type: string) {
    const index = getSet(this.nodeNameCache, type, () => 0)
    this.nodeNameCache.set(type, index + 1)
    return `${t(type)} ${index + 1}`
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
    newItem.id = item.type === 'page' ? `page_${miniId(8)}` : miniId(8)
    if ('childIds' in newItem) newItem.childIds = []
    return mergeOverrideArray(newItem, option || {}) as T
  }
}
