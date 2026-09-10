import type { MenuRootProps } from '@ark-ui/react'
import { Menu as ArkMenu, Portal } from '@ark-ui/react'
import { iife, match } from '@gitborlando/utils'
import { Fragment } from 'react'
import { OptionBalanceItem } from 'src/view/component/balance-item'
import { Divider } from 'src/view/component/divider'
import { Text } from 'src/view/component/text'

export type MenuItem = (
  | { callback: (context: any) => any; shortcut?: string }
  | { checked: boolean; onChecked: (checked: boolean) => void }
  | { render: (item: MenuItem) => ReactNode }
) & { name: string; when?: () => boolean; children?: MenuItem[][] }

export interface MenuProps extends Omit<MenuRootProps, 'children'> {
  children: ReactNode
  menus: MenuItem[][]
  triggerType?: 'click' | 'context'
  className?: string
}

export const Menu = forwardRef<HTMLDivElement, MenuProps>(
  (
    { className, children, positioning, menus, triggerType = 'click', ...rest },
    ref,
  ) => {
    return (
      <ArkMenu.Root positioning={positioning} {...rest}>
        {match(triggerType, {
          click: <ArkMenu.Trigger asChild>{children}</ArkMenu.Trigger>,
          context: (
            <ArkMenu.ContextTrigger asChild>{children}</ArkMenu.ContextTrigger>
          ),
        })}
        {!!menus.length && <MenuContent className={className} menus={menus} />}
      </ArkMenu.Root>
    )
  },
)

export const MenuContent: FC<{ className?: string; menus: MenuItem[][] }> = observer(
  ({ className, menus }) => {
    //Todo: translate to local
    const cls = classes(css`
      @layer local-components {
        & {
          ${styles.borderRadius}
          ${styles.shadow}
          background-color: white;
          padding: 6px;
          width: 180px;
          min-height: fit-content;
          outline: none;
        }
        & .menu-item {
          padding-inline-end: 8px;
        }
      }
    `)

    const getMenuContent = (menus: MenuItem[][]) => {
      return menus.map((group, groupIndex) => {
        return group.map((item, index) => {
          const disabled = item.when && !item.when()
          const hasChildren = item.children && item.children.length > 0
          const menuItem = iife(() => {
            if ('render' in item) {
              return item.render(item)
            }
            if ('checked' in item) {
              return (
                <OptionBalanceItem
                  className='menu-item'
                  label={item.name}
                  checked={item.checked}
                  onChecked={item.onChecked}
                  disabled={disabled}
                />
              )
            }
            return (
              <OptionBalanceItem
                className='menu-item'
                label={item.name}
                reserveIconSpace={false}
                disabled={disabled}
                onClick={() => !disabled && item.callback({})}>
                <Text x-if={!!item.shortcut}>{item.shortcut}</Text>
              </OptionBalanceItem>
            )
          })

          return (
            <Fragment key={item.name}>
              {hasChildren ? (
                <MenuTriggerItem trigger={menuItem}>
                  {getMenuContent(item.children!)}
                </MenuTriggerItem>
              ) : (
                <ArkMenu.Item value={item.name} disabled={disabled} asChild>
                  {menuItem}
                </ArkMenu.Item>
              )}
              <Divider
                x-if={index === group.length - 1 && groupIndex !== menus.length - 1}
                key={`divider-${index}`}
              />
            </Fragment>
          )
        })
      })
    }

    return (
      <Portal>
        <ArkMenu.Positioner>
          <ArkMenu.Content className={cx(cls(), 'menu-content', className)}>
            {getMenuContent(menus)}
          </ArkMenu.Content>
        </ArkMenu.Positioner>
      </Portal>
    )
  },
)

export const MenuTriggerItem: FC<{ trigger: ReactNode; children: ReactNode }> =
  observer(({ trigger, children }) => {
    return (
      <ArkMenu.Root positioning={{ placement: 'left-start', gutter: 160 }}>
        <ArkMenu.TriggerItem asChild>{trigger}</ArkMenu.TriggerItem>
        <MenuContent menus={children as MenuItem[][]} />
      </ArkMenu.Root>
    )
  })
