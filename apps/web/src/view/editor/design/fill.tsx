import { iife, matchCase } from '@gitborlando/utils'
import { stopPropagation } from '@gitborlando/utils/browser'
import { withSuspense } from '@gitborlando/utils/react'
import Color from 'color'
import { Eye, EyeOff, Minus, Plus } from 'lucide-react'
import { Image } from 'src/global/service/image'
import { makeLinearGradientCss, rgbToRgba } from 'src/utils/color'
import { Btn } from 'src/view/component/btn'
import { Input } from 'src/view/component/input'
import { InputNum } from 'src/view/component/input-num'
import { Lucide } from 'src/view/component/lucide'
import { Text } from 'src/view/component/text'
import {
  OpFieldComp,
  OpFieldContentComp,
  OpFieldHeaderComp,
} from 'src/view/editor/right-panel/operate/components/op-field'
import { useEditorServices } from 'src/view/hooks/editor'
import { suspend } from 'suspend-react'

export const DesignFillComp: FC<{}> = observer(({}) => {
  const { designFill } = useEditorServices()
  const { fills, isMixedFills, addFill, deleteFill } = designFill

  return (
    <OpFieldComp>
      <OpFieldHeaderComp
        title={t('fill')}
        headerSlot={
          <Btn size={30} icon={<Lucide icon={Plus} />} onClick={addFill} />
        }
      />
      <OpFieldContentComp x-if={fills.length > 0}>
        {fills.map((fill, index) => (
          <G horizontal='1fr auto' center gap={8} key={index}>
            <DesignFillItemComp fill={fill} index={index} />
            <Btn
              size={30}
              icon={<Lucide icon={Minus} />}
              onClick={() => deleteFill(index)}
            />
          </G>
        ))}
      </OpFieldContentComp>
      <OpFieldContentComp x-if={isMixedFills}>
        <Text className={cls('mixed-fills')}>{t('mixed fills')}</Text>
      </OpFieldContentComp>
    </OpFieldComp>
  )
})

export const DesignFillItemComp: FC<{ fill: S.Fill; index: number }> = ({
  fill,
  index,
}) => {
  const { fillPicker } = useEditorServices()
  const isColorType = fill.type === 'color'
  const isLinearType = fill.type === 'linearGradient'
  const isImageType = fill.type === 'image'

  const outerRef = useRef<HTMLDivElement>(null)

  const openPicker = () => {
    const outerRefBound = outerRef.current!.getBoundingClientRect()
    fillPicker.showPicker(
      index,
      XY.of(outerRefBound).plus(XY.$(-240 - 24, 0)),
      'fill',
    )
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

const ImgComp = withSuspense<{ url: string }>(({ url }) => {
  const image = suspend(() => Image.getImageAsync(url), [url])
  const imageBound = iife(() => {
    const { width, height } = image
    const rate = width / height
    return rate > 1
      ? { width: 18, height: 18 / rate }
      : { width: 18 * rate, height: 18 }
  })
  return <img src={image.objectUrl} style={{ ...imageBound }}></img>
})

const HexInputComp: FC<{ fill: S.Fill; index: number }> = observer(
  ({ fill, index }) => {
    const { designFill } = useEditorServices()
    const isSolidFill = fill.type === 'color'

    const validateColor = (value: string) => {
      try {
        Color(`#${value}`)
        return true
      } catch (error) {}
      return false
    }

    const setColor = (color: string | Nil) => {
      if (!isSolidFill) return
      designFill.setFill(index, (fill) => {
        T<S.FillColor>(fill).color = Color(`#${color}`).toString()
      })
    }

    const value = matchCase(fill.type, {
      color: Color(T<S.FillColor>(fill).color).hex().slice(1),
      linearGradient: t('linear gradient fill'),
      image: t('image fill'),
    })

    return (
      <Input
        className={cls('hex')}
        readOnly={!isSolidFill}
        value={value}
        onEnd={(value) => setColor(value)}
        onFocus={(e) => isSolidFill && e.target.select()}
        validate={validateColor}
        needFocusStyle={false}
        disabled={!isSolidFill}
      />
    )
  },
)

const AlphaInputComp: FC<{ fill: S.Fill; index: number }> = observer(
  ({ fill, index }) => {
    const { designFill } = useEditorServices()
    const setAlpha = (value: number) => {
      console.log('value: ', value)
      designFill.setFill(index, (fill) => {
        fill.alpha = value / 100
      })
    }
    return (
      <InputNum
        value={fill.alpha * 100}
        onEnd={(value) => setAlpha(Number(value) ?? 0)}
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

const VisibleComp: FC<{ fill: S.Fill; index: number }> = observer(
  ({ fill, index }) => {
    const { designFill } = useEditorServices()
    const toggleVisible = () => {
      designFill.setFill(index, (fill) => {
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
    width: 64px;
    height: 24px;
    ${styles.textLabel}
    display: grid;
    justify-items: center;
    align-items: center;
    opacity: 1;
    & > input {
      line-height: 0.8rem;
    }
  }
  &-alpha {
    width: 36px;
    height: 24px;
    ${styles.textLabel}
    padding-inline: 0;
    gap: 0;
  }
  &-mixed-fills {
    opacity: 0.65;
  }
`)
