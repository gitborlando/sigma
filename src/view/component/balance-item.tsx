import { Check } from 'lucide-react'
import { Text } from 'src/view/component/text'

export const BalanceItem = forwardRef<
  HTMLDivElement,
  ComponentPropsWithRef<'div'> & {
    left: ReactNode
    right: ReactNode
  }
>(({ className, children, left, right, ...rest }, ref) => {
  const cls = classes(css`
    width: 100%;
    height: 32px;
    justify-content: space-between;
  `)

  return (
    <G
      horizontal='auto auto'
      center
      gap={8}
      className={cx(cls(), className)}
      {...rest}
      ref={ref}>
      <G>{left}</G>
      <G>{right}</G>
    </G>
  )
})

export interface CommonBalanceItemProps extends ComponentPropsWithRef<'div'> {
  label: string
  icon?: ReactNode
  isHeader?: boolean
}

export const CommonBalanceItem = forwardRef<HTMLDivElement, CommonBalanceItemProps>(
  ({ className, label, icon, children, isHeader = false, ...rest }, ref) => {
    const cls = classes(css`
      &-label-header {
        ${styles.textHead}
      }
    `)
    return (
      <BalanceItem
        className={className}
        {...rest}
        ref={ref}
        left={<Text className={cx(isHeader && cls('label-header'))}>{label}</Text>}
        right={children}
      />
    )
  },
)

export interface OptionBalanceItemProps extends ComponentPropsWithRef<'div'> {
  label: string
  icon?: ReactNode
  reserveIconSpace?: boolean
  checked?: boolean
  onChecked?: (value: boolean) => void
}

export const OptionBalanceItem = forwardRef<HTMLDivElement, OptionBalanceItemProps>(
  (
    {
      className,
      label,
      icon,
      reserveIconSpace = true,
      checked,
      onChecked,
      onClick,
      children,
      ...rest
    },
    ref,
  ) => {
    const cls = classes(css`
      padding-inline: 8px 20px;
      cursor: pointer;
      ${styles.borderRadiusSM}
      &-has-icon {
        padding-inline-start: 4px;
      }
      &:hover {
        color: white;
        background-color: var(--color);
      }
      &:hover &-icon-checked {
        color: white;
      }
      &-icon {
        min-width: 16px;
        &-checked {
          color: var(--color);
          translate: 0 1px;
        }
      }
    `)

    const isCheckableItem = checked !== undefined && onChecked !== undefined
    if (isCheckableItem) {
      icon = checked ? (
        <Lucide icon={Check} size={16} className={cls('icon-checked')} />
      ) : null
    }

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      onClick?.(e)
      onChecked?.(!checked)
    }

    return (
      <BalanceItem
        {...rest}
        className={cx(cls(), reserveIconSpace && cls('has-icon'), className)}
        ref={ref}
        left={
          <G horizontal='auto 1fr' center gap={2}>
            {reserveIconSpace ? <G className={cls('icon')}>{icon}</G> : icon}
            <Text>{label}</Text>
          </G>
        }
        right={children}
        onClick={handleClick}
      />
    )
  },
)
