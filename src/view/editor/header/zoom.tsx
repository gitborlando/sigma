import { ChevronDown } from 'lucide-react'
import { getEditorSetting } from 'src/editor/editor/setting'
import { getZoom, StageViewport } from 'src/editor/stage/viewport'
import { OptionBalanceItem } from 'src/view/component/balance-item'
import { Divider } from 'src/view/component/divider'
import { InputNum } from 'src/view/component/input-num'
import { Menu } from 'src/view/component/menu'

export const EditorHeaderZoomComp: FC<{}> = observer(({}) => {
  const zoom = ~~((getZoom() || 0) * 100)
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
  const { updateZoom } = StageViewport

  return (
    <InputNum
      className={css`
        width: 160px;
        ${styles.borderRadiusSM}
      `}
      value={~~((getZoom() || 0) * 100)}
      onEnd={(value) => updateZoom((value || 0) / 100)}
      formatter={(value) => `${value}%`}
      parser={(value) => Number(value?.replace('%', ''))}
      needControls
    />
  )
})

const ZoomingOptionsComp: FC<{}> = observer(({}) => {
  const { updateZoom, handleZoomToFitAll, handleZoomToFitSelection } = StageViewport

  const handelSaveSceneMatrix = (shouldSave: boolean) => {
    const setting = getEditorSetting()
    setting.dev.fixedSceneMatrix = shouldSave
    if (shouldSave) {
      setting.dev.sceneMatrix = StageViewport.sceneMatrix
    }
  }

  return (
    <>
      <OptionBalanceItem label={t('zoom to 100')} onClick={() => updateZoom(1)} />
      <OptionBalanceItem label={t('zoom to fit all')} onClick={handleZoomToFitAll} />
      <OptionBalanceItem
        label={t('zoom to fit selection')}
        onClick={handleZoomToFitSelection}
      />
      <OptionBalanceItem
        label={t('save current zoom and offset')}
        checked={getEditorSetting().dev.fixedSceneMatrix}
        onChecked={handelSaveSceneMatrix}
      />
    </>
  )
})

const OtherOptionsComp: FC<{}> = observer(({}) => {
  return (
    <OptionBalanceItem
      label={t('snap to grid')}
      checked={getEditorSetting().snapToGrid}
      onChecked={(value) => {
        const setting = getEditorSetting()
        setting.snapToGrid = value
      }}
    />
  )
})
