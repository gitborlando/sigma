import autobind from 'class-autobind-decorator'
import { ID, IText } from '../schema/type'
import { getSelectedNodes } from '../utils/get'

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
    YClients.afterSelect.hook(this.setupTextNodes)
    YState.subscribe((patches) => {
      const changed = patches.some((patch) => {
        return patch.keys[1] === 'content' || patch.keys[1] === 'style'
      })
      if (changed) this.setupTextNodes()
    })
    this.afterOperate.hook(() => {
      YUndo.track({ type: 'state', description: '改变 text' })
    })
  }
  setTextStyle(key: ITextStyleKey, value: ITextStyle[ITextStyleKey]) {
    this.immui.reset(this.textStyle, [key], value)
    this.applyChangeToYState(key, value)
  }
  toggleTextStyle(key: ITextStyleKey, value: ITextStyle[ITextStyleKey]) {
    this.immui.reset(this.textStyle, [key], value)
    this.applyChangeToYState(key, value)
    YUndo.track({ type: 'state', description: '改变 text style' })
  }
  setTextContent(textNode: IText, content: string) {
    YState.transact(() => {
      YState.set(`${textNode.id}.content`, content)
    })
  }
  private setupTextNodes() {
    this.textNodes = getSelectedNodes().filter((node) => {
      return node.type === 'text'
    }) as IText[]
    if (!this.textNodes.length) return
    this.setupTextStyle()
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
  private applyChangeToYState(key: ITextStyleKey, value: ITextStyle[ITextStyleKey]) {
    this.textStyle = this.immui.next(this.textStyle)[0]
    YState.transact(() => {
      this.textNodes.forEach((node) => {
        YState.set(`${node.id}.style.${key}`, value)
      })
    })
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
