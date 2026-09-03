import { Check } from 'lucide-react'
import { Menu } from 'src/view/component/menu'
import { useContextMenu } from 'src/view/features/context-menu'
import { useSelectPageId } from 'src/view/hooks/use-selection'
import { useEditorServices } from 'src/view/hooks/use-services'

type IPageItemComp = { name: string; id: string }

export const LayerPageListItemComp: FC<IPageItemComp> = observer(({ name, id }) => {
  const { command, select, undo } = useEditorServices()
  const contextMenu = useContextMenu()
  const selectPageId = useSelectPageId()
  const selected = selectPageId === id

  const selectPage = () => {
    select.selectPage(id)
    undo.track('client', t('select page'))
  }
  const handleContextMenu = (e: React.MouseEvent) => {
    contextMenu.menus = [command.pageGroup]
    contextMenu.open(e)
  }

  return (
    <Menu menus={[command.pageGroup]} triggerType='context'>
      <G
        horizontal='1fr auto'
        center
        className={cls()}
        onClick={selectPage}
        onContextMenu={handleContextMenu}>
        <G horizontal center>
          {name}
        </G>
        <Check x-if={selected} className={cls('check')} size={16} />
      </G>
    </Menu>
  )
})

const cls = classes(css`
  justify-content: space-between;
  width: 100%;
  height: 32px;
  cursor: pointer;
  border: 1px solid transparent;
  ${styles.textLabel}
  padding-inline: 12px;
  &:hover {
    border: 1px solid var(--color);
  }
  &-check {
    color: var(--color);
  }
`)
