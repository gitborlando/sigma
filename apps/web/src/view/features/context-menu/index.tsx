import { createContext } from 'react'
import { Menu } from 'src/view/component/menu'
import { ContextMenuState } from 'src/view/features/context-menu/state'

export const ContextMenuComp: FC<{}> = observer(({}) => {
  const contextMenu = useContextMenu()

  return (
    <Menu
      triggerType='context'
      positioning={{ placement: 'bottom-start' }}
      menus={contextMenu?.menus || []}>
      <div style={{ position: 'fixed' }} ref={contextMenu?.setRef} />
    </Menu>
  )
})

export const ContextMenuContext = createContext<ContextMenuState>(null!)

export const useContextMenu = () => useContext(ContextMenuContext)
