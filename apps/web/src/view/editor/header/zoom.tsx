import { ChevronDown } from 'lucide-react'
import { OptionBalanceItem } from 'src/view/component/balance-item'
import { Divider } from 'src/view/component/divider'
import { InputNum } from 'src/view/component/input-num'
import { Lucide } from 'src/view/component/lucide'
import { Menu } from 'src/view/component/menu'
import { useEditorService } from 'src/view/hooks/editor'

export const EditorHeaderZoomComp: FC<{}> = observer(({}) => {
  const zoom = ~~((useEditorService('stageViewport').zoom || 0) * 100)
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
  const stageViewport = useEditorService('stageViewport')
  const { updateZoom } = stageViewport

  return (
    <InputNum
      className={css`
        width: 160px;
        ${styles.borderRadiusSM}
      `}
      value={~~((stageViewport.zoom || 0) * 100)}
      onEnd={(value) => updateZoom((value || 0) / 100)}
      formatter={(value) => `${value}%`}
      parser={(value) => Number(value?.replace('%', ''))}
      needControls
    />
  )
})

const ZoomingOptionsComp: FC<{}> = observer(({}) => {
  const stageViewport = useEditorService('stageViewport')
  const viewportController = useEditorService('viewportController')
  const { zoomToFitAll, zoomToFitSelection } = viewportController

  return (
    <>
      <OptionBalanceItem
        label={t('zoom to 100')}
        onClick={() => stageViewport.updateZoom(1)}
      />
      <OptionBalanceItem label={t('zoom to fit all')} onClick={zoomToFitAll} />
      <OptionBalanceItem
        label={t('zoom to fit selection')}
        onClick={zoomToFitSelection}
      />
    </>
  )
})

const OtherOptionsComp: FC<{}> = observer(({}) => {
  const setting = useEditorService('editorSetting').setting

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
