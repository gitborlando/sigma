import { ChevronDown, Plus } from 'lucide-react'
import { Btn } from 'src/view/component/btn'
import { Lucide } from 'src/view/component/lucide'
import { useEditorServices } from 'src/view/hooks/editor'
import { useSelectPage } from 'src/view/hooks/schema/use-y-state'

export const LayerPageListHeaderComp: FC<{}> = observer(({}) => {
  const { handlePage, layerPageList } = useEditorServices()
  const { isCollapsed } = layerPageList
  const selectPage = useSelectPage()
  const addPage = () => {
    layerPageList.isCollapsed = false
    handlePage.addPage()
  }

  return (
    <G center horizontal='1fr auto auto' gap={4} className={cls()}>
      <G center horizontal className={cls('title')}>
        {selectPage.name}
      </G>
      <Btn onClick={addPage} icon={<Lucide icon={Plus} />} />
      <Btn
        onClick={() => (layerPageList.isCollapsed = !isCollapsed)}
        icon={
          <Lucide
            icon={ChevronDown}
            style={{ rotate: isCollapsed ? '180deg' : '0deg' }}
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
