import { createCache, matchCase } from '@gitborlando/utils'
import Color from 'color'
import { OperateFill } from 'src/editor/operate/fill'
import { SchemaCreator } from 'src/editor/schema/creator'
import { IRGBA } from 'src/utils/color'
import { DragPanel } from 'src/view/component/drag-panel'
import { Segments } from 'src/view/component/segments'
import { ColorPicker } from 'src/view/editor/right-panel/operate/picker/color-picker'
import { PickerImageComp } from 'src/view/editor/right-panel/operate/picker/image'
import { PickerLinearGradientComp } from 'src/view/editor/right-panel/operate/picker/linear-gradient'
import { FillPickerState } from 'src/view/editor/right-panel/operate/picker/state'
import { useUnmount } from 'src/view/hooks/common'

const createFillCache = (type: V1.Fill['type']) =>
  matchCase(type, {
    color: SchemaCreator.fillColor(),
    linearGradient: SchemaCreator.fillLinearGradient(),
    image: SchemaCreator.fillImage(),
  })
const fillCache = createCache<V1.Fill['type'], V1.Fill>()

export const FillPickerComp: FC<{}> = observer(({}) => {
  const { t } = useTranslation()

  const { fillIndex, fillType, pickerPos, changeFill } = FillPickerState
  const fill = OperateFill.fills[fillIndex]

  useEffect(() => {
    fillCache.set(fill.type, fill)
  }, [fill])

  useUnmount(() => {
    fillCache.clear()
  })

  // useEffect(() => {
  //   StageTransform.show.dispatch(false)
  //   return () => void StageTransform.show.dispatch(true)
  // })

  const handleChangeFill = (value: V1.Fill['type']) => {
    FillPickerState.fillType = value
    changeFill(fillCache.getSet(value, () => createFillCache(value)))
    YUndo.track({ type: 'state', description: t('change fill type') })
  }

  return (
    <DragPanel
      title={t('noun.colorPicker')}
      closeFunc={() => FillPickerState.hidePicker()}
      clickAwayClose={() => FillPickerState.isShowPicker}
      xy={pickerPos}
      className={cls()}>
      <G vertical className={cls('content')} gap={12}>
        <Segments
          options={[
            { label: t('noun.solidColor'), value: 'color' },
            { label: t('noun.linear'), value: 'linearGradient' },
            { label: t('noun.image'), value: 'image' },
          ]}
          value={fillType}
          onChange={(value) => handleChangeFill(value as V1.Fill['type'])}
        />
        {/* <Radio.Group
          type='button'
          value={fillType}
          size='mini'
          onChange={handleChangeFill}>
          <Radio value='color'>{t('noun.solidColor')}</Radio>
          <Radio value='linearGradient'>{t('noun.linear')}</Radio>
          <Radio value='image'>{t('noun.image')}</Radio>
        </Radio.Group> */}
        {fill.type === 'color' && (
          <PickerSolidComp fill={fill as V1.FillColor} index={fillIndex} />
        )}
        {fill.type === 'linearGradient' && (
          <PickerLinearGradientComp
            fill={fill as V1.FillLinearGradient}
            index={fillIndex}
          />
        )}
        {fill.type === 'image' && <PickerImageComp fill={fill as V1.FillImage} />}
      </G>
    </DragPanel>
  )
})

export const PickerSolidComp: FC<{ fill: V1.FillColor; index: number }> = memo(
  ({ fill, index }) => {
    const getRgbaFromSolidFill = (fill: V1.FillColor) => {
      const { color, alpha } = fill
      return Color(color).alpha(alpha).toString()
    }
    const handleChange = (rgba: IRGBA) => {
      const rgb = Color.rgb(rgba.r, rgba.g, rgba.b).string()
      OperateFill.setFill(index, (draft) => {
        if (draft.type !== 'color') return
        draft.color = rgb
        draft.alpha = rgba.a
      })
    }
    return (
      <G>
        <ColorPicker color={getRgbaFromSolidFill(fill)} onChange={handleChange} />
      </G>
    )
  },
)

const cls = classes(css`
  &-content {
    padding: 12px;
  }
`)
