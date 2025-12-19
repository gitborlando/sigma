import { ContextMenu } from 'src/global/context-menu'
import { OptionBalanceItem } from 'src/view/component/balance-item'
import { Divider } from 'src/view/component/divider'
import { Menu } from 'src/view/component/menu'
import { Text } from 'src/view/component/text'

export const ContextMenuComp: FC<{}> = observer(({}) => {
  const { setRef, menus } = ContextMenu

  return (
    <Menu
      className={cls()}
      trigger={<div ref={setRef} style={{ position: 'fixed' }}></div>}
      triggerType='context'
      onOpenChange={({ open }) => (ContextMenu.triggered = open)}>
      {menus.map((group, groupIndex) => {
        return group.map((item, index) => {
          if (index === group.length - 1 && groupIndex !== menus.length - 1) {
            return <Divider key={`divider-${index}`} />
          }
          return (
            <OptionBalanceItem
              className={cls('item')}
              key={item.name}
              label={item.name}
              reserveIconSpace={false}>
              <Text x-if={!!item.shortcut} className={cls('item-shortcut')}>
                {item.shortcut}
              </Text>
            </OptionBalanceItem>
          )
        })
      })}
    </Menu>
  )
})

const cls = classes(css`
  width: 180px;
  min-height: fit-content;
  ${styles.borderRadius}
  padding-inline: 6px;
  &-item {
    padding-inline-end: 8px;
  }
`)
