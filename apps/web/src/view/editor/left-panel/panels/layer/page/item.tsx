import { Check } from 'lucide-react'
import { EditorCommand } from 'src/editor/editor/command'
import { ContextMenu } from 'src/global/context-menu'
import { useSelectPageId } from 'src/view/hooks/schema/use-y-client'

type IPageItemComp = {
  name: string
  id: string
}

export const PageItemComp: FC<IPageItemComp> = observer(({ name, id }) => {
  const openMenu = (e: React.MouseEvent) => {
    ContextMenu.context = { id }
    ContextMenu.menus = [EditorCommand.pageGroup]
    ContextMenu.openMenu(e)
  }
  const selectPage = () => {
    YClients.selectPage(id)
    // Schema.commitHistory('选择页面 ' + id)
  }
  // useMatchPatch(`/client/selectPageId`)

  const selectPageId = useSelectPageId()
  const selected = selectPageId === id

  return (
    <G
      horizontal='1fr auto'
      center
      className={cls()}
      onClick={selectPage}
      onContextMenu={openMenu}>
      <G horizontal center>
        {name}
      </G>
      <Check x-if={selected} className={cls('check')} size={16} />
    </G>
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
