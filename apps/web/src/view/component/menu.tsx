import type { MenuRootProps } from '@ark-ui/react'
import { Menu as ArkMenu, Portal } from '@ark-ui/react'
import { matchCase } from '@gitborlando/utils'
import { ChevronRight } from 'lucide-react'
import {
  OptionBalanceItem,
  OptionBalanceItemProps,
} from 'src/view/component/balance-item'

export interface MenuProps extends Omit<MenuRootProps, 'children'> {
  trigger: ReactNode
  triggerType?: 'click' | 'context'
  children: ReactNode
  className?: string
}

export const Menu = forwardRef<HTMLDivElement, MenuProps>(
  (
    { className, trigger, triggerType = 'click', children, positioning, ...rest },
    ref,
  ) => {
    const cls = classes(css`
      ${styles.borderRadius}
      ${styles.shadow}
        background-color: white;
      padding: 6px;
      min-width: fit-content;
      min-height: fit-content;
      outline: none;
    `)

    return (
      <ArkMenu.Root positioning={positioning} {...rest}>
        {matchCase(triggerType, {
          click: <ArkMenu.Trigger asChild>{trigger}</ArkMenu.Trigger>,
          context: (
            <ArkMenu.ContextTrigger asChild>{trigger}</ArkMenu.ContextTrigger>
          ),
        })}
        <Portal>
          <ArkMenu.Positioner>
            <ArkMenu.Content className={cx(cls(), className)}>
              {children}
            </ArkMenu.Content>
          </ArkMenu.Positioner>
        </Portal>
      </ArkMenu.Root>
    )
  },
)

export const MenuTriggerItem: FC<{} & OptionBalanceItemProps> = observer(
  ({ label, icon, reserveIconSpace, children, ...rest }) => {
    return (
      <ArkMenu.Root positioning={{ placement: 'left-start', gutter: 160 }}>
        <ArkMenu.TriggerItem asChild>
          <OptionBalanceItem
            label={label}
            icon={icon}
            reserveIconSpace={reserveIconSpace}
            children={<Lucide icon={ChevronRight} size={16} />}
            {...rest}
          />
        </ArkMenu.TriggerItem>
        <Portal>
          <ArkMenu.Positioner>
            <ArkMenu.Content>{children}</ArkMenu.Content>
          </ArkMenu.Positioner>
        </Portal>
      </ArkMenu.Root>
    )
  },
)
