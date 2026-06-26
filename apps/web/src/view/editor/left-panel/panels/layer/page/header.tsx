import { ChevronDown, Plus } from 'lucide-react'
import { Btn } from 'src/view/component/btn'
import { Lucide } from 'src/view/component/lucide'
import { useEditor } from 'src/view/hooks/editor'
import { useSelectPage } from 'src/view/hooks/schema/use-y-state'

export const PageHeaderComp: FC<{}> = observer(({}) => {
  const editor = useEditor()
  const { handlePage, layerPanel } = editor
  const { pagePanelExpanded } = layerPanel
  const selectPage = useSelectPage()
  const addPage = () => {
    layerPanel.pagePanelExpanded = pagePanelExpanded || true
    handlePage.addPage()
  }

  return (
    <G center horizontal='1fr auto auto' gap={4} className={cls()}>
      <G center horizontal className={cls('title')}>
        {selectPage.name}
      </G>
      <Btn onClick={addPage} icon={<Lucide icon={Plus} />} />
      <Btn
        onClick={() => (layerPanel.pagePanelExpanded = !pagePanelExpanded)}
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
