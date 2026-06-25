import { ChevronDown, Plus } from 'lucide-react'
import { HandlePage, LayerPanel } from 'src/editor'
import { Btn } from 'src/view/component/btn'
import { Lucide } from 'src/view/component/lucide'
import { useSelectPage } from 'src/view/hooks/schema/use-y-state'

export const PageHeaderComp: FC<{}> = observer(({}) => {
  const { pagePanelExpanded } = LayerPanel
  const selectPage = useSelectPage()
  const addPage = () => {
    LayerPanel.pagePanelExpanded = pagePanelExpanded || true
    HandlePage.addPage()
  }

  return (
    <G center horizontal='1fr auto auto' gap={4} className={cls()}>
      <G center horizontal className={cls('title')}>
        {selectPage.name}
      </G>
      <Btn onClick={addPage} icon={<Lucide icon={Plus} />} />
      <Btn
        onClick={() => (LayerPanel.pagePanelExpanded = !pagePanelExpanded)}
        icon={
          <Lucide
            icon={ChevronDown}
            style={{ rotate: pagePanelExpanded ? '0deg' : '180deg' }}
          />
        }
      />
    </G>
  )
})

const cls = classes(css`
  padding-inline: 12px 6px;
  height: 32px;
  &-title {
    ${styles.textLabel}
    color: gray;
  }
`)
