import { Service } from '@gitborlando/di-service'
import { XY } from '@gitborlando/geo'
import { getSet, miniId } from '@gitborlando/utils'
import { getLatestVersion } from 'src/editor/doc/migrate'
import { MRect } from 'src/editor/geometry'
import { createLine } from 'src/editor/geometry/point'
import { COLOR } from 'src/shared/color'
import { T } from 'src/shared/common'
import { mergeOverrideArray } from 'src/shared/export'
import { t } from 'src/view/i18n/config'
import { themeColor } from 'src/view/styles/color'

@reflection
export class DocCreator extends Service {
  constructor() {
    super()
    autoBind(this)
  }

  doc(): S.Doc {
    const page = this.page()
    const meta = this.meta()
    meta.pageIds = [page.id]
    return Object.assign({ meta }, { graphs: { [page.id]: page }, points: {} })
  }

  meta(): S.Meta {
    return {
      type: 'design',
      id: miniId(16),
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
      parentId: '',
      name: this.createNodeName('page'),
      ...MRect.identity(Infinity, Infinity).plain(),
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
      variant: 'frame',
      radius: 0,
      childIds: [],
      ...nodeBase,
      fills: [this.fillColor(COLOR.white)],
      strokeSide: { type: 'all' },
      ...option,
    }
  }

  group(option?: Partial<S.Group>): S.Group {
    const nodeBase = this.createNodeBase()
    return { variant: 'group', childIds: [], ...nodeBase, ...option }
  }

  rect(option?: Partial<S.Rect>): S.Rect {
    const nodeBase = this.createNodeBase()
    return {
      variant: 'rect',
      radius: 0,
      strokeSide: { type: 'all' },
      ...nodeBase,
      ...option,
    }
  }

  ellipse(option?: Partial<S.Ellipse>): S.Ellipse {
    const nodeBase = this.createNodeBase()
    return mergeOverrideArray(
      {
        variant: 'ellipse',
        innerRate: 0,
        startAngle: 0,
        sweepAngle: 360,
        ...nodeBase,
      },
      { ...option },
    )
  }

  line(option?: Partial<S.Line>): S.Line {
    const nodeBase = this.createNodeBase()
    const start = XY.$(nodeBase.matrix.tx, nodeBase.matrix.ty)
    const length = option?.width || nodeBase.width
    const points = createLine(start, length)
    return {
      variant: 'line',
      points,
      ...nodeBase,
      fills: [this.fillColor(COLOR.black, 1)],
      stroke: this.solidStroke(),
      ...option,
      height: 0,
    }
  }

  path(option?: Partial<S.Path>): S.Path {
    const nodeBase = this.createNodeBase()
    return { variant: 'path', points: [], ...nodeBase, ...option }
  }

  image(option?: Partial<S.Rect>): S.Rect {
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
          variant: 'text',
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

  fillLinear(start: IXY = XY.$(0, 0), end: IXY = XY.$(1, 1)): S.FillLinear {
    return {
      type: 'linear',
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
      fills: [],
      align: 'center',
      width: 1,
      style: 'solid',
      dash: 2,
      gap: 2,
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

  private createNodeMeta(): S.NodeMeta {
    return {
      id: miniId(8),
      type: 'node',
      name: '',
      lock: false,
      visible: true,
      parentId: '',
      ...MRect.identity(100, 100).plain(),
    }
  }

  private createNodeBase(): S.NodeLike {
    return {
      ...this.createNodeMeta(),
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

  addPageToDoc(doc: S.Doc, page: S.Page) {
    doc.graphs[page.id] = page
    doc.meta.pageIds.push(page.id)
  }

  addChild(doc: S.Doc, parent: S.Parent, child: S.Node) {
    doc.graphs[child.id] = child
    parent.childIds.push(child.id)
    child.parentId = parent.id
  }
}
