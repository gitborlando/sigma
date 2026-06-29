import { Check } from 'lucide-react'
import { ContextMenu } from 'src/global/context-menu'
import { useEditorService } from 'src/view/hooks/editor'
import { useSelectPageId } from 'src/view/hooks/schema/use-y-client'

type IPageItemComp = {
  name: string
  id: string
}

export const PageItemComp: FC<IPageItemComp> = observer(({ name, id }) => {
  const editorCommand = useEditorService('editorCommand')
  const handleSelect = useEditorService('handleSelect')
  const undo = useEditorService('undo')

  const openMenu = (e: React.MouseEvent) => {
    ContextMenu.context = { id }
    ContextMenu.menus = [editorCommand.pageGroup]
    ContextMenu.openMenu(e)
  }
  const selectPage = () => {
    handleSelect.selectPage(id)
    undo.track('client', t('select page'))
  }

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
