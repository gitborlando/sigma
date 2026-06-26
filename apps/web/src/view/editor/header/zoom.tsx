import { ChevronDown } from 'lucide-react'
import { getSetting, getZoom } from 'src/editor/utils/get'
import { OptionBalanceItem } from 'src/view/component/balance-item'
import { Divider } from 'src/view/component/divider'
import { InputNum } from 'src/view/component/input-num'
import { Lucide } from 'src/view/component/lucide'
import { Menu } from 'src/view/component/menu'
import { useEditor } from 'src/view/hooks/editor'

export const EditorHeaderZoomComp: FC<{}> = observer(({}) => {
  const editor = useEditor()
  const zoom = ~~((getZoom(editor) || 0) * 100)
  const [show, setShow] = useState(false)

  const cls = classes(css`
    width: fit-content;
    height: 32px;
    padding: 8px;
    cursor: pointer;
    ${styles.bgHoverGray}
    ${styles.borderRadius}
    ${styles.textCommon}
  `)

  return (
    <Menu
      positioning={{ placement: 'bottom' }}
      trigger={
        <G center horizontal className={cls()} onClick={() => setShow(!show)}>
          <G>{zoom}%</G>
          <Lucide icon={ChevronDown} size={16} />
        </G>
      }>
      <PanelComp />
    </Menu>
  )
})

const PanelComp: FC<{}> = observer(({}) => {
  const cls = classes(css``)
  return (
    <G vertical center className={cls()}>
      <InputZoomComp />
      <Divider />
      <ZoomingOptionsComp />
      <Divider />
      <OtherOptionsComp />
    </G>
  )
})

const InputZoomComp: FC<{}> = observer(({}) => {
  const editor = useEditor()
  const { updateZoom } = editor.stageViewport

  return (
    <InputNum
      className={css`
        width: 160px;
        ${styles.borderRadiusSM}
      `}
      value={~~((getZoom(editor) || 0) * 100)}
      onEnd={(value) => updateZoom((value || 0) / 100)}
      formatter={(value) => `${value}%`}
      parser={(value) => Number(value?.replace('%', ''))}
      needControls
    />
  )
})

const ZoomingOptionsComp: FC<{}> = observer(({}) => {
  const editor = useEditor()
  const { updateZoom, handleZoomToFitAll, handleZoomToFitSelection } =
    editor.stageViewport

  return (
    <>
      <OptionBalanceItem label={t('zoom to 100')} onClick={() => updateZoom(1)} />
      <OptionBalanceItem label={t('zoom to fit all')} onClick={handleZoomToFitAll} />
      <OptionBalanceItem
        label={t('zoom to fit selection')}
        onClick={handleZoomToFitSelection}
      />
    </>
  )
})

const OtherOptionsComp: FC<{}> = observer(({}) => {
  const editor = useEditor()
  const setting = getSetting(editor)

  return (
    <OptionBalanceItem
      label={t('snap to grid')}
      checked={setting.snapToGrid}
      onChecked={(value) => {
        setting.snapToGrid = value
      }}
    />
  )
})
