import { iife, matchCase } from '@gitborlando/utils'
import { stopPropagation } from '@gitborlando/utils/browser'
import { Eye, EyeOff } from 'lucide-react'
import { ImgManager } from 'src/editor/editor/img-manager'
import { OperateFill } from 'src/editor/operate/fill'
import { makeLinearGradientCss, rgbToRgba } from 'src/utils/color'
import { InputNum } from 'src/view/component/input-num'
import { suspense } from 'src/view/component/suspense'
import { FillPickerState } from 'src/view/editor/right-panel/operate/picker/state'
import i18n from 'src/view/i18n/config'
import { suspend } from 'suspend-react'

export const EditorRPOperateFillItemComp: FC<{
  fill: V1.Fill
  index: number
}> = ({ fill, index }) => {
  const isColorType = fill.type === 'color'
  const isLinearType = fill.type === 'linearGradient'
  const isImageType = fill.type === 'image'

  const outerRef = useRef<HTMLDivElement>(null)

  const openPicker = () => {
    const outerRefBound = outerRef.current!.getBoundingClientRect()
    FillPickerState.showPicker(index, XY.of(outerRefBound).plus(XY.$(-240 - 24, 0)))
  }

  return (
    <G
      horizontal
      center
      className={cls()}
      ref={outerRef}
      onMouseDown={stopPropagation()}>
      <G className={cls('shower')} onClick={openPicker}>
        {isColorType && (
          <G style={{ backgroundColor: rgbToRgba(fill.color, fill.alpha) }}></G>
        )}
        {isLinearType && <G style={{ background: makeLinearGradientCss(fill) }}></G>}
        {isImageType && <ImgComp url={fill.url} />}
      </G>
      <HexInputComp fill={fill} index={index} />
      <AlphaInputComp fill={fill} index={index} />
      <VisibleComp fill={fill} index={index} />
    </G>
  )
}

const ImgComp: FC<{ url: string }> = suspense(({ url }) => {
  const image = suspend(() => ImgManager.getImageAsync(url), [url])
  const imageBound = iife(() => {
    const { width, height } = image
    const rate = width / height
    return rate > 1
      ? { width: 18, height: 18 / rate }
      : { width: 18 * rate, height: 18 }
  })
  return <img src={image.objectUrl} style={{ ...imageBound }}></img>
})

const HexInputComp: FC<{
  fill: V1.Fill
  index: number
}> = observer(({ fill, index }) => {
  const isSolidFill = fill.type === 'color'

  const validateColor = (value: string) => {
    try {
      Color(`#${value}`)
      return true
    } catch (error) {}
    return false
  }

  const setColor = (color: string) => {
    if (!isSolidFill) {
      return
    }
    OperateFill.setFill(index, (fill) => {
      T<V1.FillColor>(fill).color = Color(`#${color}`).toString()
    })
  }

  const value = matchCase(fill.type, {
    color: Color(T<V1.FillColor>(fill).color).hex().slice(1),
    linearGradient: i18n.language === 'en' ? 'linear' : t('noun.linearGradient'),
    image: `${t('noun.image')} ${t('noun.fill')}`,
  })

  return null
  // return (
  //   <Input
  //     className={cls('hex')}
  //     noHoverFocusStyle
  //     readOnly={!isSolidFill}
  //     value={value}
  //     onEnd={(value) => setColor(value)}
  //     onFocus={(e) => isSolidFill && e.target.select()}
  //     validate={validateColor}
  //   />
  // )
})

const AlphaInputComp: FC<{ fill: V1.Fill; index: number }> = observer(
  ({ fill, index }) => {
    const setAlpha = (value: number) => {
      console.log('value: ', value)
      OperateFill.setFill(index, (fill) => {
        fill.alpha = value / 100
      })
    }
    return (
      <InputNum
        value={fill.alpha * 100}
        onEnd={(value) => setAlpha(value ?? 0)}
        className={cls('alpha')}
        min={0}
        max={100}
        formatter={(value) => `${value}%`}
        parser={(value) => Number(value?.replace('%', ''))}
        needAutoSelect
        needFocusStyle={false}
      />
    )
  },
)

const VisibleComp: FC<{ fill: V1.Fill; index: number }> = observer(
  ({ fill, index }) => {
    const toggleVisible = () => {
      OperateFill.setFill(index, (fill) => {
        fill.visible = !fill.visible
      })
    }
    return (
      <Lucide
        icon={fill.visible ? Eye : EyeOff}
        size={14}
        onClick={toggleVisible}
        style={{ cursor: 'pointer' }}
      />
    )
  },
)

const cls = classes(css`
  width: 185px;
  height: 30px;
  ${styles.borderRadius}
  ${styles.bgGray}
  padding: 8px;
  justify-content: space-between;
  color: #2e2e2e;
  ${styles.focus}
  &-shower {
    width: 18px;
    height: 18px;
    overflow: hidden;
    ${styles.borderRadiusSM}
    ${styles.shadow}
    cursor: pointer;
  }
  &-hex {
    width: 54px;
    height: 24px;
    ${styles.textLabel}
    display: grid;
    justify-items: center;
    align-items: center;
  }
  &-alpha {
    width: 36px;
    height: 24px;
    ${styles.textLabel}
    padding-inline: 0;
    gap: 0;
  }
`)
