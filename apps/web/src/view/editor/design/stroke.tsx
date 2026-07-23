import Color from 'color'
import { ChevronDown, Eye, EyeOff, Minus, Plus } from 'lucide-react'
import { makeLinearGradientCss, rgbToRgba } from 'src/utils/color'
import { Btn } from 'src/view/component/btn'
import { InputNum } from 'src/view/component/input-num'
import { Lucide } from 'src/view/component/lucide'
import { Segments } from 'src/view/component/segments'
import {
  OpFieldComp,
  OpFieldContentComp,
  OpFieldHeaderComp,
} from 'src/view/editor/right-panel/operate/components/op-field'
import { useEditorServices } from 'src/view/hooks/editor'

const alignOptions = [
  { label: '内侧', value: 'inner' },
  { label: '居中', value: 'center' },
  { label: '外侧', value: 'outer' },
]

export const DesignStrokeComp: FC<{}> = observer(({}) => {
  const { designStroke, undo } = useEditorServices()
  const { stroke, isMixedStroke, addFill } = designStroke

  const setStroke = (
    label: string,
    setter: (stroke: S.Stroke) => S.Stroke | void,
  ) => {
    designStroke.setStroke(setter)
    undo.track('state', label)
  }

  return (
    <OpFieldComp>
      <OpFieldHeaderComp
        title='描边'
        headerSlot={
          <>
            {isMixedStroke && <span className={cls('mixed')}>{t('mixed')}</span>}
            <Btn
              size={30}
              title={stroke.visible ? '隐藏描边' : '显示描边'}
              active={!stroke.visible}
              icon={<Lucide icon={stroke.visible ? Eye : EyeOff} />}
              onClick={() =>
                setStroke(t('toggle stroke visibility'), (stroke) => {
                  stroke.visible = !stroke.visible
                })
              }
            />
            <Btn
              size={30}
              title='添加描边颜色'
              icon={<Lucide icon={Plus} />}
              onClick={addFill}
            />
          </>
        }
      />
      <OpFieldContentComp>
        <G vertical gap={8} data-muted={!stroke.visible} className={cls('body')}>
          {stroke.fills.length ? (
            <G vertical gap={6}>
              {stroke.fills.map((fill, index) => (
                <StrokeFillItemComp fill={fill} index={index} key={index} />
              ))}
            </G>
          ) : (
            <Btn
              variant='outline'
              className={cls('empty')}
              icon={<Lucide icon={Plus} />}
              onClick={addFill}>
              添加描边颜色
            </Btn>
          )}

          <G horizontal='minmax(0, 1fr) minmax(0, 1fr)' gap={8}>
            <InputNum
              value={stroke.width}
              min={0}
              max={1000}
              prefix={<span className={cls('input-label')}>W</span>}
              suffix='px'
              onEnd={(value) =>
                setStroke(t('change stroke width'), (stroke) => {
                  stroke.width = Math.max(0, Number(value ?? 0))
                })
              }
            />
            <Segments
              className={cls('align')}
              options={alignOptions}
              value={stroke.align}
              onChange={(value) =>
                setStroke(t('change stroke alignment'), (stroke) => {
                  stroke.align = value as S.Stroke['align']
                })
              }
            />
          </G>

          <G horizontal='minmax(0, 1fr) minmax(0, 1fr)' gap={8}>
            <StrokeSelectComp
              label='端点'
              value={stroke.cap}
              options={[
                { label: '平头', value: 'butt' },
                { label: '圆头', value: 'round' },
                { label: '方头', value: 'square' },
              ]}
              onChange={(value) =>
                setStroke(t('change stroke cap'), (stroke) => {
                  stroke.cap = value as S.Stroke['cap']
                })
              }
            />
            <StrokeSelectComp
              label='连接'
              value={stroke.join}
              options={[
                { label: '斜接', value: 'miter' },
                { label: '圆角', value: 'round' },
                { label: '斜角', value: 'bevel' },
              ]}
              onChange={(value) =>
                setStroke(t('change stroke join'), (stroke) => {
                  stroke.join = value as S.Stroke['join']
                })
              }
            />
          </G>
        </G>
      </OpFieldContentComp>
    </OpFieldComp>
  )
})

const StrokeFillItemComp: FC<{ fill: S.Fill; index: number }> = observer(
  ({ fill, index }) => {
    const { designStroke, fillPicker, undo } = useEditorServices()
    const previewRef = useRef<HTMLButtonElement>(null)
    const previewStyle =
      fill.type === 'color'
        ? { background: rgbToRgba(fill.color, fill.alpha) }
        : fill.type === 'linearGradient'
          ? { background: makeLinearGradientCss(fill) }
          : {
              backgroundImage: `url("${fill.url}")`,
              backgroundPosition: 'center',
              backgroundSize: 'cover',
            }
    const label =
      fill.type === 'color'
        ? Color(fill.color).hex().slice(1)
        : fill.type === 'linearGradient'
          ? '线性渐变'
          : '图片'

    const openPicker = () => {
      const bounds = previewRef.current!.getBoundingClientRect()
      fillPicker.showPicker(index, XY.of(bounds).plus(XY.$(-240 - 24, 0)), 'stroke')
    }

    return (
      <G horizontal='30px minmax(0, 1fr) 50px 24px 24px' center gap={4}>
        <button
          ref={previewRef}
          className={cls('preview')}
          style={previewStyle}
          title='编辑描边颜色'
          onClick={openPicker}
        />
        <span className={cls('fill-label')}>{label}</span>
        <InputNum
          className={cls('alpha')}
          value={fill.alpha * 100}
          min={0}
          max={100}
          formatter={(value) => `${value}%`}
          parser={(value) => Number(value?.replace('%', ''))}
          onEnd={(value) => {
            designStroke.setFill(index, (fill) => {
              fill.alpha = Math.min(1, Math.max(0, Number(value ?? 0) / 100))
            })
            undo.track('state', t('change stroke fill opacity'))
          }}
        />
        <Btn
          title={fill.visible ? '隐藏颜色层' : '显示颜色层'}
          icon={<Lucide icon={fill.visible ? Eye : EyeOff} size={14} />}
          onClick={() => {
            designStroke.setFill(index, (fill) => {
              fill.visible = !fill.visible
            })
            undo.track('state', t('toggle stroke fill visibility'))
          }}
        />
        <Btn
          title='删除颜色层'
          icon={<Lucide icon={Minus} size={14} />}
          onClick={() => {
            fillPicker.hidePicker()
            designStroke.deleteFill(index)
          }}
        />
      </G>
    )
  },
)

const StrokeSelectComp: FC<{
  label: string
  value: string
  options: { label: string; value: string }[]
  onChange: (value: string) => void
}> = ({ label, value, options, onChange }) => (
  <label className={cls('select')}>
    <span>{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option value={option.value} key={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    <Lucide icon={ChevronDown} size={12} />
  </label>
)

const cls = classes(css`
  &-mixed {
    padding: 2px 6px;
    color: rgba(0, 0, 0, 0.5);
    background: var(--gray-bg);
    font-size: 10px;
    ${styles.borderRadiusSM}
  }
  &-body {
    width: 100%;
    &[data-muted='true'] {
      opacity: 0.55;
    }
  }
  &-empty {
    width: 100%;
    color: rgba(0, 0, 0, 0.55);
    border-style: dashed;
  }
  &-preview {
    width: 24px;
    height: 24px;
    padding: 0;
    border: 2px solid white;
    outline: 1px solid var(--gray-border);
    cursor: pointer;
    ${styles.borderRadiusSM}
  }
  &-fill-label {
    min-width: 0;
    overflow: hidden;
    color: rgba(0, 0, 0, 0.72);
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &-alpha {
    height: 24px;
    padding-inline: 6px;
    font-size: 11px;
  }
  &-input-label {
    color: rgba(0, 0, 0, 0.45);
    font-size: 10px;
    font-weight: 600;
  }
  &-align {
    width: 100%;
    height: 30px;
    & > [role='radio'] {
      min-width: 0;
      padding-inline: 6px;
    }
  }
  &-select {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding-inline: 8px 6px;
    color: rgba(0, 0, 0, 0.48);
    background: var(--gray-bg);
    font-size: 11px;
    ${styles.borderRadius}
    &:focus-within {
      outline: 1px solid var(--color);
      background: white;
    }
    & select {
      min-width: 0;
      border: 0;
      outline: 0;
      appearance: none;
      color: rgba(0, 0, 0, 0.78);
      background: transparent;
      font-size: 11px;
      cursor: pointer;
    }
    & .lucide {
      pointer-events: none;
    }
  }
`)
