import { Minus, Plus } from 'lucide-react'
import { Btn } from 'src/view/component/btn'
import { InputNum } from 'src/view/component/input-num'
import { Lucide } from 'src/view/component/lucide'
import { SelectOption } from 'src/view/component/select-option'
import { Icon } from 'src/view/component/svg-icon'
import { Text } from 'src/view/component/text'
import { DesignFillItemComp } from 'src/view/editor/design/fill'
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
  const { designStroke, fillPicker, undo } = useEditorServices()
  const { stroke, isMixedStroke, addFill, deleteFill } = designStroke

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
          <Btn
            size={30}
            title='添加描边颜色'
            icon={<Lucide icon={Plus} />}
            onClick={addFill}
          />
        }
      />
      {!isMixedStroke && stroke.fills.length > 0 && (
        <OpFieldContentComp>
          <G vertical gap={8} className={cls('body')}>
            <G horizontal='minmax(0, 1fr) minmax(0, 1fr)' gap={8}>
              <InputNum
                value={stroke.width}
                min={0}
                max={1000}
                prefix={<Icon src={Assets.editor.design.geom.width} />}
                onSlide={(delta) =>
                  designStroke.setStroke((stroke) => {
                    stroke.width = Math.min(1000, Math.max(0, stroke.width + delta))
                  })
                }
                onEnd={(value) =>
                  setStroke(t('change stroke width'), (stroke) => {
                    stroke.width = Math.max(0, Number(value ?? 0))
                  })
                }
              />
              <SelectOption
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

            <G vertical gap={8}>
              {stroke.fills.map((fill, index) => (
                <G horizontal='1fr auto' center gap={8} key={index}>
                  <DesignFillItemComp fill={fill} index={index} target='stroke' />
                  <Btn
                    size={30}
                    title='删除描边颜色'
                    icon={<Lucide icon={Minus} />}
                    onClick={() => {
                      fillPicker.hidePicker()
                      deleteFill(index)
                    }}
                  />
                </G>
              ))}
            </G>
          </G>
        </OpFieldContentComp>
      )}
      {isMixedStroke && (
        <OpFieldContentComp>
          <Text className={cls('mixed-strokes')}>{t('mixed strokes')}</Text>
        </OpFieldContentComp>
      )}
    </OpFieldComp>
  )
})

const cls = classes(css`
  &-body {
    width: 100%;
  }
  &-mixed-strokes {
    opacity: 0.65;
  }
  &-align {
    width: 100%;
    height: 30px;
  }
`)
