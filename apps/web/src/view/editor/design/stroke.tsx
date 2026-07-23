import {
  Circle,
  CornerDownRight,
  Minus,
  Plus,
  SlidersVertical,
  Spline,
  Square,
  Triangle,
} from 'lucide-react'
import { Btn } from 'src/view/component/btn'
import { DragPanel } from 'src/view/component/drag-panel'
import { InputNum } from 'src/view/component/input-num'
import { Lucide } from 'src/view/component/lucide'
import { Segments } from 'src/view/component/segments'
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

const styleOptions = [
  { label: '实线', value: 'solid' },
  { label: '虚线', value: 'dashed' },
]

const strokeSettingsPanelWidth = 202

// TODO: 替换为专用的描边端点图标：Butt cap、Square cap、Round cap。
const dashCapOptions = [
  { label: <Lucide icon={Minus} />, value: 'butt', title: '平头端点' },
  { label: <Lucide icon={Square} />, value: 'square', title: '方头端点' },
  { label: <Lucide icon={Circle} />, value: 'round', title: '圆头端点' },
]

// TODO: 替换为专用的描边连接图标：Miter join、Round join、Bevel join。
const joinOptions = [
  { label: <Lucide icon={CornerDownRight} />, value: 'miter', title: '斜接' },
  { label: <Lucide icon={Spline} />, value: 'round', title: '圆角连接' },
  { label: <Lucide icon={Triangle} />, value: 'bevel', title: '斜角连接' },
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
            <G horizontal='minmax(0, 1fr) minmax(0, 1fr) 30px' gap={8}>
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
              <StrokeSettingsPanel
                stroke={stroke}
                designStroke={designStroke}
                setStroke={setStroke}
              />
            </G>

            <G vertical gap={8} className={cls('fills')}>
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

interface StrokeSettingsPanelProps {
  stroke: S.Stroke
  designStroke: ReturnType<typeof useEditorServices>['designStroke']
  setStroke: (label: string, setter: (stroke: S.Stroke) => S.Stroke | void) => void
}

const StrokeSettingsPanel: FC<StrokeSettingsPanelProps> = observer(
  ({ stroke, designStroke, setStroke }) => {
    const triggerRef = useRef<HTMLButtonElement>(null)
    const [show, setShow] = useState(false)
    const [panelXY, setPanelXY] = useState<IXY>()

    const togglePanel = () => {
      if (show) {
        setShow(false)
        return
      }

      const bounds = triggerRef.current!.getBoundingClientRect()
      setPanelXY(
        XY.$(
          Math.max(8, bounds.left - strokeSettingsPanelWidth - 8),
          Math.max(8, Math.min(bounds.top, innerHeight - 320)),
        ),
      )
      setShow(true)
    }

    return (
      <>
        <Btn
          ref={triggerRef}
          size={30}
          title='描边设置'
          active={show}
          icon={<Lucide icon={SlidersVertical} />}
          onClick={togglePanel}
        />
        <DragPanel
          show={show}
          title='描边设置'
          width={strokeSettingsPanelWidth}
          xy={panelXY}
          clickAwayClose
          className={cls('settings-panel')}
          onShow={setShow}>
          <G vertical gap={8} className={cls('settings-body')}>
            <StrokeSettingRow label='风格'>
              <SelectOption
                options={styleOptions}
                value={stroke.style}
                onChange={(value) =>
                  setStroke(t('change stroke style'), (stroke) => {
                    stroke.style = value as S.Stroke['style']
                  })
                }
              />
            </StrokeSettingRow>

            {stroke.style === 'dashed' && (
              <>
                <StrokeSettingRow label='虚线'>
                  <InputNum
                    value={stroke.dash}
                    min={0}
                    max={1000}
                    prefix={<Icon src={Assets.editor.design.geom.width} />}
                    onSlide={(delta) =>
                      designStroke.setStroke((stroke) => {
                        stroke.dash = Math.min(
                          1000,
                          Math.max(0, stroke.dash + delta),
                        )
                      })
                    }
                    onEnd={(value) =>
                      setStroke(t('change stroke dash'), (stroke) => {
                        stroke.dash = Math.max(0, Number(value ?? 0))
                      })
                    }
                  />
                </StrokeSettingRow>

                <StrokeSettingRow label='间隔'>
                  <InputNum
                    value={stroke.gap}
                    min={0}
                    max={1000}
                    prefix={<Icon src={Assets.editor.design.geom.width} />}
                    onSlide={(delta) =>
                      designStroke.setStroke((stroke) => {
                        stroke.gap = Math.min(1000, Math.max(0, stroke.gap + delta))
                      })
                    }
                    onEnd={(value) =>
                      setStroke(t('change stroke gap'), (stroke) => {
                        stroke.gap = Math.max(0, Number(value ?? 0))
                      })
                    }
                  />
                </StrokeSettingRow>

                <StrokeSettingRow label='虚线端点'>
                  <Segments
                    className={cls('segments')}
                    options={dashCapOptions}
                    itemWidth={32}
                    value={stroke.cap}
                    onChange={(value) =>
                      setStroke(t('change stroke cap'), (stroke) => {
                        stroke.cap = value as S.Stroke['cap']
                      })
                    }
                  />
                </StrokeSettingRow>
              </>
            )}

            <StrokeSettingRow label='连接'>
              <Segments
                className={cls('segments')}
                options={joinOptions}
                itemWidth={32}
                value={stroke.join}
                onChange={(value) =>
                  setStroke(t('change stroke join'), (stroke) => {
                    stroke.join = value as S.Stroke['join']
                  })
                }
              />
            </StrokeSettingRow>
          </G>
        </DragPanel>
      </>
    )
  },
)

const StrokeSettingRow: FC<{ label: string; children: ReactNode }> = ({
  label,
  children,
}) => (
  <G horizontal='64px 106px' center gap={8}>
    <span className={cls('field-label')}>{label}</span>
    {children}
  </G>
)

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
  &-segments {
    width: fit-content;
    height: 30px;
    justify-self: end;
  }
  &-field-label {
    color: rgba(0, 0, 0, 0.5);
    font-size: 12px;
  }
  &-settings-panel {
    max-height: calc(100vh - 16px);
  }
  &-settings-body {
    padding: 12px;
    overflow-y: auto;
  }
  &-fills {
    padding-top: 4px;
    margin-top: 2px;
    border-top: 1px solid var(--gray-border);
  }
`)
