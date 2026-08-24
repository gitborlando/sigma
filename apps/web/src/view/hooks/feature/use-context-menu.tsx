import { FC, useRef } from 'react'
import { Menu as MenuComp, MenuItem } from 'src/view/features/menu'

export interface ContextMenuOption {
  xy: IXY
}

export function useContextMenu(
  getMenus: (option: ContextMenuOption) => MenuItem[][],
) {
  const menuTrigger = useRef<HTMLDivElement>(null)
  const [xy, setXY] = useState<IXY>({ x: 0, y: 0 })
  const [menus, setMenus] = useState<MenuItem[][]>([])

  const handleOpenMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    const xy = XY.client(e)
    setXY(xy)
    setMenus(getMenus({ xy }))
    console.log('xy: ', xy)

    e.preventDefault()
    menuTrigger.current?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }

  const Menu: FC<{ xy: IXY; menus: MenuItem[][] }> = useCallback(
    ({ xy, menus }) => (
      <MenuComp positioning={{ placement: 'top-start' }} menus={menus}>
        <div
          style={{ position: 'fixed', top: xy.y, left: xy.x }}
          className='abc'
          ref={menuTrigger}
        />
      </MenuComp>
    ),
    [],
  )

  return { handleOpenMenu, Menu, xy, menus }
}
