import { getSet, match } from '@gitborlando/utils'
import { useClean, withPrepare } from '@gitborlando/utils/react'
import Color from 'color'
import { DocCreator } from 'src/editor/doc/creator'
import { IRGBA } from 'src/utils/color'
import { DragPanel } from 'src/view/component/drag-panel'
import { Segments } from 'src/view/component/segments'
import { ColorPicker } from 'src/view/editor/right-panel/operate/picker/color-picker'
import { PickerImageComp } from 'src/view/editor/right-panel/operate/picker/image'
import { PickerLinearComp } from 'src/view/editor/right-panel/operate/picker/linear-gradient'
import { useEditorServices } from 'src/view/hooks/editor'

const createFillCache = (docCreator: DocCreator, type: S.Fill['type']): S.Fill => {
  if (type === 'color') return docCreator.fillColor()
  if (type === 'linear') return docCreator.fillLinear()
  return docCreator.fillImage(Assets.editor.design.fill.defaultImage)
}
const fillCache = new Map<S.Fill['type'], S.Fill>()

export const DesignPickerComp = observer(
  withPrepare<{ fill: S.Fill }>(
    () => {
      const { fillPicker } = useEditorServices()
      const fill = fillPicker.fill
      return fill ? { fill } : null
    },
    observer(({ fill }) => {
      const { fillPicker, docCreator, undo } = useEditorServices()
      const { fillIndex, fillType, pickerPos, changeFill } = fillPicker

      useEffect(() => {
        fillCache.set(fill.type, fill)
      }, [fill])

      useClean(() => {
        fillCache.clear()
      })

      const handleChangeFill = (value: S.Fill['type']) => {
        fillPicker.fillType = value
        changeFill(
          getSet(fillCache, value, () => createFillCache(docCreator, value)),
        )
        undo.track('state', t('change fill type'))
      }

      return (
        <DragPanel
          title={t('color picker')}
          clickAwayClose={true}
          xy={pickerPos}
          className={cls()}
          show={fillPicker.isShowPicker}
          onShow={(show) => !show && fillPicker.hidePicker()}>
          <G vertical className={cls('content')} gap={12}>
            <Segments
              options={[
                { label: t('solid color'), value: 'color' },
                { label: t('linear'), value: 'linear' },
                { label: t('image'), value: 'image' },
              ]}
              value={fillType}
              onChange={(value) => handleChangeFill(value as S.Fill['type'])}
            />
            {match(fill, 'type', {
              color: (fill) => <PickerSolidComp fill={fill} index={fillIndex} />,
              linear: (fill) => <PickerLinearComp fill={fill} index={fillIndex} />,
              image: (fill) => <PickerImageComp fill={fill as S.FillImage} />,
            })}
          </G>
        </DragPanel>
      )
    }),
  ),
)

export const PickerSolidComp: FC<{ fill: S.FillColor; index: number }> = observer(
  ({ fill, index }) => {
    const { fillPicker, undo } = useEditorServices()
    const getRgbaFromSolidFill = (fill: S.FillColor) => {
      const { color, alpha } = fill
      return Color(color).alpha(alpha).toString()
    }
    const handleChange = (rgba: IRGBA) => {
      const rgb = Color.rgb(rgba.r, rgba.g, rgba.b).string()
      fillPicker.setFill((draft) => {
        if (draft.type !== 'color') return
        draft.color = rgb
        draft.alpha = rgba.a
      })
    }
    const handleEnd = () => {
      undo.track('state', t('adjust color'))
    }
    return (
      <G>
        <ColorPicker
          color={getRgbaFromSolidFill(fill)}
          onChange={handleChange}
          onEnd={handleEnd}
        />
      </G>
    )
  },
)

const cls = classes(css`
  &-content {
    padding: 12px;
  }
`)
