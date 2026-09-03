import { match } from '@gitborlando/utils'
import { stopPropagation } from '@gitborlando/utils/browser'
import { withSuspense } from '@gitborlando/utils/react'
import Color from 'color'
import { Eye, EyeOff, Minus, Plus } from 'lucide-react'
import { makeLinearGradientCss, rgbToRgba } from 'src/shared/color'
import { Btn } from 'src/view/component/btn'
import { Input } from 'src/view/component/input'
import { InputNum } from 'src/view/component/input-num'
import { Lucide } from 'src/view/component/lucide'
import { Text } from 'src/view/component/text'
import {
  DesignFieldComp,
  DesignFieldContentComp,
  DesignFieldHeaderComp,
} from 'src/view/editor/design/share/field'
import { useEditorServices, useGlobalServices } from 'src/view/hooks/use-services'

export const DesignFillComp: FC<{}> = observer(({}) => {
  const { designFill } = useEditorServices()
  const { fills, addFill, deleteFill } = designFill

  return (
    <DesignFieldComp>
      <DesignFieldHeaderComp
        title={t('fill')}
        headerSlot={
          <Btn size={30} icon={<Lucide icon={Plus} />} onClick={addFill} />
        }
      />
      {fills && fills.length > 0 && (
        <DesignFieldContentComp>
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
        </DesignFieldContentComp>
      )}
      {!fills && (
        <DesignFieldContentComp>
          <Text className={cls('mixed-fills')}>{t('mixed fills')}</Text>
        </DesignFieldContentComp>
      )}
    </DesignFieldComp>
  )
})

type DesignFillTarget = 'fill' | 'stroke'

export const DesignFillItemComp: FC<{
  fill: S.Fill
  index: number
  target?: DesignFillTarget
}> = ({ fill, index, target = 'fill' }) => {
  const { fillPicker } = useEditorServices()
  const isColorType = fill.type === 'color'
  const isLinearType = fill.type === 'linear'
  const isImageType = fill.type === 'image'

  const outerRef = useRef<HTMLDivElement>(null)

  const openPicker = () => {
    const outerRefBound = outerRef.current!.getBoundingClientRect()
    fillPicker.showPicker(
      index,
      XY.of(outerRefBound).plus(XY.$(-240 - 24, 0)),
      target,
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
        {isImageType && <ImgComp id={fill.url} />}
      </G>
      <HexInputComp fill={fill} index={index} target={target} />
      <AlphaInputComp fill={fill} index={index} target={target} />
      <VisibleComp fill={fill} index={index} target={target} />
    </G>
  )
}

const ImgComp = withSuspense<{ id: string }>(({ id }) => {
  const { storageAPI } = useGlobalServices()
  const url = !!id ? storageAPI.getUrl(id) : Assets.editor.design.fill.defaultImage
  return (
    <img src={url} style={{ width: 18, height: 18, objectFit: 'contain' }}></img>
  )
})

const HexInputComp: FC<{ fill: S.Fill; index: number; target: DesignFillTarget }> =
  observer(({ fill, index, target }) => {
    const { designFill, designStroke } = useEditorServices()
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
      const setter = (fill: S.Fill) => {
        T<S.FillColor>(fill).color = Color(`#${color}`).toString()
      }
      if (target === 'fill') designFill.setFill(index, setter)
      else designStroke.setFill(index, setter)
    }

    const value = match(fill.type, {
      color: Color(T<S.FillColor>(fill).color).hex().slice(1),
      linear: t('linear gradient fill'),
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
  })

const AlphaInputComp: FC<{ fill: S.Fill; index: number; target: DesignFillTarget }> =
  observer(({ fill, index, target }) => {
    const { designFill, designStroke } = useEditorServices()
    const setAlpha = (value: number) => {
      const setter = (fill: S.Fill) => {
        fill.alpha = value / 100
      }
      if (target === 'fill') designFill.setFill(index, setter)
      else designStroke.setFill(index, setter)
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
  })

const VisibleComp: FC<{ fill: S.Fill; index: number; target: DesignFillTarget }> =
  observer(({ fill, index, target }) => {
    const { designFill, designStroke } = useEditorServices()
    const toggleVisible = () => {
      const setter = (fill: S.Fill) => {
        fill.visible = !fill.visible
      }
      if (target === 'fill') designFill.setFill(index, setter)
      else designStroke.setFill(index, setter)
    }
    return (
      <Lucide
        icon={fill.visible ? Eye : EyeOff}
        size={14}
        onClick={toggleVisible}
        style={{ cursor: 'pointer' }}
      />
    )
  })

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
