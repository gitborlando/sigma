import { ChevronDown } from 'lucide-react'
import { OptionBalanceItem } from 'src/view/component/balance-item'
import { InputNum } from 'src/view/component/input-num'
import { Lucide } from 'src/view/component/lucide'
import { Menu, MenuItem } from 'src/view/component/menu'
import { useEditorServices } from 'src/view/hooks/use-services'

export const EditorHeaderZoomComp: FC<{}> = observer(({}) => {
  const { stageViewport } = useEditorServices()
  const zoom = ~~((stageViewport.zoom || 0) * 100)

  const cls = classes(css`
    width: fit-content;
    height: 32px;
    padding: 8px;
    cursor: pointer;
    ${styles.bgHoverGray}
    ${styles.borderRadius}
    ${styles.textCommon}
  `)

  const menus: MenuItem[][] = [
    [{ name: 'input zoom', render: () => <InputZoomComp /> }],
    [{ name: 'zooming options', render: () => <ZoomingOptionsComp /> }],
    [{ name: 'other options', render: () => <OtherOptionsComp /> }],
  ]

  return (
    <Menu positioning={{ placement: 'bottom' }} menus={menus}>
      <G center horizontal className={cls()}>
        <G>{zoom}%</G>
        <Lucide icon={ChevronDown} size={16} />
      </G>
    </Menu>
  )
})

const InputZoomComp: FC<{}> = observer(({}) => {
  const { stageViewport } = useEditorServices()
  const { updateZoom } = stageViewport

  return (
    <InputNum
      className={css`
        width: 100%;
        ${styles.borderRadiusSM}
      `}
      value={~~((stageViewport.zoom || 0) * 100)}
      onEnd={(value) => updateZoom(((value as number) || 0) / 100)}
      formatter={(value) => `${value}%`}
      parser={(value) => Number(value?.replace('%', ''))}
      needControls
    />
  )
})

const ZoomingOptionsComp: FC<{}> = observer(({}) => {
  const { stageViewport, viewportAction } = useEditorServices()
  const { zoomToFitAll, zoomToFitSelection } = viewportAction

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
  const { setting } = useEditorServices()
  const settings = setting

  return (
    <OptionBalanceItem
      label={t('snap to grid')}
      checked={settings.snapToGrid}
      onChecked={(value) => {
        settings.snapToGrid = value
      }}
    />
  )
})
