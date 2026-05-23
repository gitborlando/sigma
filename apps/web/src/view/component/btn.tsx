import { ark, HTMLArkProps } from '@ark-ui/react/factory'

type BtnVariant = 'solid' | 'outline' | 'ghost'
type BtnSize = 24 | 28 | 30 | 32 | 36

export const Btn = forwardRef<
  HTMLButtonElement,
  HTMLArkProps<'button'> & {
    variant?: BtnVariant
    size?: BtnSize
    active?: boolean
    icon?: ReactNode
  }
>(
  (
    { className, variant = 'ghost', size, active = false, icon, children, ...rest },
    ref,
  ) => {
    const isIconOnly = icon && !children
    size ||= isIconOnly ? 24 : 32
    return (
      <ark.button
        ref={ref}
        data-active={active}
        data-icon-only={isIconOnly || undefined}
        className={cx(cls(), cls(variant), cls(`${size}`), className)}
        {...rest}>
        {icon}
        {children}
      </ark.button>
    )
  },
)

const cls = classes(css`
  @layer local-components {
    & {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
      border: none;
      outline: none;
      transition: all 0.15s ease;
      ${styles.borderRadius}
    }

    /* Size variants */
    &-24 {
      height: 24px;
      padding: 0 8px;
      font-size: 11px;
    }
    &-28 {
      height: 28px;
      padding: 0 10px;
      font-size: 12px;
    }
    &-30 {
      height: 30px;
      padding: 0 12px;
      font-size: 13px;
    }
    &-32 {
      height: 32px;
      padding: 0 14px;
      font-size: 14px;
    }
    &-36 {
      height: 36px;
      padding: 0 22px;
      font-size: 15px;
    }

    /* Variant: ghost */
    &-ghost {
      background: transparent;
      color: inherit;
      &:not([data-active='true']):hover {
        ${styles.bgHoverGray}
      }
      &[data-active='true'] {
        color: white;
        background-color: var(--color);
      }
    }

    /* Variant: solid */
    &-solid {
      background: var(--color);
      color: white;
      &:not([data-active='true']):hover {
        opacity: 0.9;
      }
    }

    /* Variant: outline */
    &-outline {
      background: transparent;
      ${styles.border}
      &:not([data-active='true']):hover {
        ${styles.borderHoverPrimary}
      }
    }

    /* Disabled */
    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      pointer-events: none;
    }

    /* Icon only button */
    &[data-icon-only] {
      padding: 0;
      aspect-ratio: 1/1;
    }
  }
`)
