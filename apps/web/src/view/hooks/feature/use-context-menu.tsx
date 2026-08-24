import { FC, useRef, useState } from 'react'
import { Menu as MenuComp, MenuItem } from 'src/view/features/menu'

export interface ContextMenuOption {
  xy: IXY
}

export function useContextMenu(
  getMenus: (option: ContextMenuOption) => MenuItem[][],
) {
  const menuTrigger = useRef<HTMLDivElement>(null)
  const menuOpened = useRef(false)
  const [xy, setXY] = useState({ x: 0, y: 0 })
  const [menus, setMenus] = useState<MenuItem[][]>([[]])

  const handleOpenMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    // if (menuOpened.current) return
    // menuOpened.current = true

    const xy = XY.client(e)
    setMenus(getMenus({ xy }))
    setXY(xy)
    console.log('xy: ', xy)

    e.preventDefault()
    menuTrigger.current?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }

  const Menu: FC<{}> = () => (
    <MenuComp
      onOpenChange={(e) => (menuOpened.current = e.open)}
      positioning={{ placement: 'bottom-start' }}
      menus={menus}>
      <div style={{ position: 'fixed', top: xy.y, left: xy.x }} ref={menuTrigger} />
    </MenuComp>
  )

  return { menuTrigger, menuOpened, xy, menus, handleOpenMenu, Menu }
}
