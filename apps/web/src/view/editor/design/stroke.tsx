import { clamp } from 'es-toolkit'
import { Minus, Plus } from 'lucide-react'
import { Fragment } from 'react'
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
  DesignFieldComp,
  DesignFieldContentComp,
  DesignFieldHeaderComp,
} from 'src/view/editor/design/share/field'
import { Menu, MenuItem } from 'src/view/features/menu'
import { useEditorServices } from 'src/view/hooks/use-services'

const alignOptions = [
  { label: 'inner', value: 'inner' },
  { label: 'center', value: 'center' },
  { label: 'outer', value: 'outer' },
]

const styleOptions = [
  { label: 'solid', value: 'solid' },
  { label: 'dashed', value: 'dashed' },
]

const strokeSideOptions = [
  { label: 'all sides', value: 'all', icon: Assets.editor.design.stroke.sideAll },
  { label: 'top side', value: 'top', icon: Assets.editor.design.stroke.sideTop },
  {
    label: 'right side',
    value: 'right',
    icon: Assets.editor.design.stroke.sideRight,
  },
  {
    label: 'bottom side',
    value: 'bottom',
    icon: Assets.editor.design.stroke.sideBottom,
  },
  { label: 'left side', value: 'left', icon: Assets.editor.design.stroke.sideLeft },
] satisfies {
  label: string
  value: Exclude<S.StrokeSide['type'], 'custom'>
  icon: string
}[]

const strokeSettingsPanelWidth = 202

const capOptions = [
  {
    label: <Icon src={Assets.editor.design.stroke.capButt} />,
    value: 'butt',
    title: 'butt cap',
  },
  {
    label: <Icon src={Assets.editor.design.stroke.capSquare} />,
    value: 'square',
    title: 'square cap',
  },
  {
    label: <Icon src={Assets.editor.design.stroke.capRound} />,
    value: 'round',
    title: 'round cap',
  },
]

const joinOptions = [
  {
    label: <Icon src={Assets.editor.design.stroke.joinMiter} />,
    value: 'miter',
    title: 'miter join',
  },
  {
    label: <Icon src={Assets.editor.design.stroke.joinRound} />,
    value: 'round',
    title: 'round join',
  },
  {
    label: <Icon src={Assets.editor.design.stroke.joinBevel} />,
    value: 'bevel',
    title: 'bevel join',
  },
]

export const DesignStrokeComp: FC<{}> = observer(({}) => {
  const { designStroke, fillPicker, undo, stageViewport } = useEditorServices()
  const { stroke, addFill, deleteFill } = designStroke

  const setStroke = (
    label: string,
    setter: (stroke: S.Stroke) => S.Stroke | void,
  ) => {
    designStroke.setStroke(setter)
    undo.track('state', label)
  }

  return (
    <DesignFieldComp>
      <DesignFieldHeaderComp
        title={t('stroke')}
        headerSlot={
          <Fragment>
            <StrokeSideSelect x-if={(stroke?.fills?.length || 0) > 0} />
            <Btn
              size={30}
              title={t('add stroke fill')}
              icon={<Lucide icon={Plus} />}
              onClick={addFill}
            />
          </Fragment>
        }
      />
      {stroke && stroke.fills.length > 0 && (
        <DesignFieldContentComp>
          <G vertical gap={8} className={cls('body')}>
            <G horizontal='minmax(0, 1fr) minmax(0, 1fr) 30px' gap={8}>
              <InputNum
                value={stroke.width}
                min={0}
                max={1000}
                slideRate={1 / stageViewport.zoom}
                prefix={<Icon src={Assets.editor.design.stroke.strokeWidth} />}
                onSlide={(delta) =>
                  designStroke.setStroke((stroke) => {
                    stroke.width = clamp(stroke.width + delta, 0, 1000)
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
                options={alignOptions.map((option) => ({
                  ...option,
                  label: t(option.label),
                }))}
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

            <G vertical gap={8}>
              {stroke.fills.map((fill, index) => (
                <G horizontal='1fr auto' center gap={8} key={index}>
                  <DesignFillItemComp fill={fill} index={index} target='stroke' />
                  <Btn
                    size={30}
                    title={t('delete stroke fill')}
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
        </DesignFieldContentComp>
      )}
      {!stroke && (
        <DesignFieldContentComp>
          <Text className={cls('mixed-strokes')}>{t('mixed strokes')}</Text>
        </DesignFieldContentComp>
      )}
    </DesignFieldComp>
  )
})

const StrokeSideSelect: FC<{}> = observer(({}) => {
  const { designStroke } = useEditorServices()
  const { strokeSide } = designStroke
  const selectedOption =
    strokeSideOptions.find((option) => option.value === strokeSide?.type) ??
    strokeSideOptions[0]
  const menus: MenuItem[][] = [
    [
      ...strokeSideOptions.map((option) => ({
        name: t(option.label),
        checked: strokeSide?.type === option.value,
        onChecked: () => designStroke.setStrokeSide(option.value),
      })),
    ],
  ]

  return (
    <Menu
      positioning={{ placement: 'bottom-end' }}
      menus={menus}
      className={cls('side-menu')}>
      <Btn
        x-if={!!strokeSide}
        size={30}
        title={t('stroke side')}
        icon={<Icon src={selectedOption.icon} />}
      />
    </Menu>
  )
})

interface StrokeSettingsPanelProps {
  stroke: S.Stroke
  designStroke: ReturnType<typeof useEditorServices>['designStroke']
  setStroke: (label: string, setter: (stroke: S.Stroke) => S.Stroke | void) => void
}

const StrokeSettingsPanel: FC<StrokeSettingsPanelProps> = observer(
  ({ stroke, designStroke, setStroke }) => {
    const { stageViewport } = useEditorServices()
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
          title={t('stroke settings')}
          active={show}
          icon={<Icon src={Assets.editor.design.misc.config} />}
          onClick={togglePanel}
        />
        <DragPanel
          show={show}
          title={t('stroke settings')}
          width={strokeSettingsPanelWidth}
          xy={panelXY}
          clickAwayClose
          className={cls('settings-panel')}
          onShow={setShow}>
          <G vertical gap={8} className={cls('settings-body')}>
            <StrokeSettingRow label={t('style')}>
              <SelectOption
                options={styleOptions.map((option) => ({
                  ...option,
                  label: t(option.label),
                }))}
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
                <StrokeSettingRow label={t('dash')}>
                  <InputNum
                    value={stroke.dash}
                    min={0}
                    max={1000}
                    slideRate={1 / stageViewport.zoom}
                    prefix={<Icon src={Assets.editor.design.stroke.strokeWidth} />}
                    onSlide={(delta) =>
                      designStroke.setStroke((stroke) => {
                        stroke.dash = clamp(stroke.dash + delta, 0, 1000)
                      })
                    }
                    onEnd={(value) =>
                      setStroke(t('change stroke dash'), (stroke) => {
                        stroke.dash = Math.max(0, Number(value ?? 0))
                      })
                    }
                  />
                </StrokeSettingRow>

                <StrokeSettingRow label={t('gap')}>
                  <InputNum
                    value={stroke.gap}
                    min={0}
                    max={1000}
                    slideRate={1 / stageViewport.zoom}
                    prefix={<Icon src={Assets.editor.design.stroke.strokeWidth} />}
                    onSlide={(delta) =>
                      designStroke.setStroke((stroke) => {
                        stroke.gap = clamp(stroke.gap + delta, 0, 1000)
                      })
                    }
                    onEnd={(value) =>
                      setStroke(t('change stroke gap'), (stroke) => {
                        stroke.gap = Math.max(0, Number(value ?? 0))
                      })
                    }
                  />
                </StrokeSettingRow>
              </>
            )}

            <StrokeSettingRow label={t('cap')}>
              <Segments
                className={cls('segments')}
                options={capOptions.map((option) => ({
                  ...option,
                  title: t(option.title),
                }))}
                itemWidth={32}
                value={stroke.cap}
                onChange={(value) =>
                  setStroke(t('change stroke cap'), (stroke) => {
                    stroke.cap = value as S.Stroke['cap']
                  })
                }
              />
            </StrokeSettingRow>

            <StrokeSettingRow label={t('join')}>
              <Segments
                className={cls('segments')}
                options={joinOptions.map((option) => ({
                  ...option,
                  title: t(option.title),
                }))}
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
  &-side-menu {
    width: 120px;
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
`)
