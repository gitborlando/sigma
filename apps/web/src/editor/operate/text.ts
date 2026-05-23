import autobind from 'class-autobind-decorator'
import { SchemaHistory } from '../schema/history'
import { Schema } from '../schema/schema'
import { ID, IText } from '../schema/type'
import { OperateNode } from './node'

type ITextStyle = IText['style']
export type ITextStyleKey = keyof ITextStyle
type IMulti = 'multi' & (string & {})

type IBaseStyle = ReturnType<typeof createBaseStyle>
const createBaseStyle = () => ({
  fontSize: <ITextStyle['fontSize']>16,
  fontWeight: <ITextStyle['fontWeight']>'500',
  align: <ITextStyle['align']>'left',
  fontFamily: <ITextStyle['fontFamily']>'Arial',
  fontStyle: <ITextStyle['fontStyle']>'normal',
  letterSpacing: <ITextStyle['letterSpacing']>30,
  lineHeight: <ITextStyle['lineHeight']>16,
})
// const createBaseStyle = () => ({
//   fontSize: <ITextStyle['fontSize'] | IMulti>16,
//   fontWeight: <ITextStyle['fontWeight'] | IMulti>'500',
//   align: <ITextStyle['align'] | IMulti>'left',
//   breakWords: <ITextStyle['breakWords'] | IMulti>false,
//   fontFamily: <ITextStyle['fontFamily'] | IMulti>'Arial',
//   fontStyle: <ITextStyle['fontStyle'] | IMulti>'normal',
//   letterSpacing: <ITextStyle['letterSpacing'] | IMulti>0,
//   lineHeight: <ITextStyle['lineHeight'] | IMulti>16,
// })

export const textStyleKeys = <IBaseStyleKey[]>Object.keys(createBaseStyle())

type IBaseStyleKey = keyof IBaseStyle

@autobind
class OperateTextService {
  textStyle = createBaseStyle()
  afterOperate = Signal.create()
  intoEditing = Signal.create<ID>()
  textNodes = <IText[]>[]
  textStyleOptions = createTextStyleOptions()
  private immui = new (class {})()
  initHook() {
    OperateNode.selectedNodes.hook(() => {
      this.textNodes = OperateNode.selectedNodes.value.filter((node) => {
        return node.type === 'text'
      }) as IText[]
      if (!this.textNodes.length) return
      this.setupTextStyle()
    })
    this.afterOperate.hook(() => {
      SchemaHistory.commit('改变 text')
    })
  }
  setTextStyle(key: ITextStyleKey, value: ITextStyle[ITextStyleKey]) {
    this.immui.reset(this.textStyle, [key], value)
    this.applyChangeToSchema()
  }
  toggleTextStyle(key: ITextStyleKey, value: ITextStyle[ITextStyleKey]) {
    this.immui.reset(this.textStyle, [key], value)
    this.applyChangeToSchema()
    SchemaHistory.commit('改变 text style')
  }
  setTextContent(textNode: IText, content: string) {
    Schema.itemReset(textNode, ['content'], content)
    Schema.commitOperation('改变 text content')
    Schema.nextSchema()
  }
  private setupTextStyle() {
    const newTextStyle = <IBaseStyle>{}
    textStyleKeys.forEach((key) => {
      let firstNodeStyleValue = this.textNodes[0].style[key] //@ts-ignore
      this.textNodes.forEach(({ style }) => {
        if (style[key] === firstNodeStyleValue) {
          //@ts-ignore
          newTextStyle[key] = firstNodeStyleValue
        } else {
          //@ts-ignore
          newTextStyle[key] = typeof style[key] === 'number' ? -1 : 'multi'
        }
      })
    })
    this.textStyle = newTextStyle
  }
  private applyChangeToSchema() {
    const nodes = OperateNode.selectedNodes.value
    const patches = this.immui.next(this.textStyle)[1]
    nodes.forEach((node) =>
      Schema.applyPatches(patches, { prefix: `/${node.id}/style` }),
    )
    Schema.commitOperation('改变 text styles')
    Schema.nextSchema()
  }
}

export const OperateText = new OperateTextService()

function createTextStyleOptions() {
  return {
    align: ['left', 'center', 'right'],
    fontWeight: [
      'normal',
      'bold',
      'bolder',
      'lighter',
      '100',
      '200',
      '300',
      '400',
      '500',
      '600',
      '700',
      '800',
      '900',
    ],
  }
}
