import { SegmentGroup } from '@ark-ui/react'

type SegmentSize = 'sm' | 'md' | 'lg'
type SegmentVariant = 'solid' | 'outline'

export type SegmentOption = {
  label: string
  value: string
  disabled?: boolean
}

export const Segments = forwardRef<
  HTMLDivElement,
  ComponentPropsWithRef<'div'> & {
    options: SegmentOption[]
    value?: string
    defaultValue?: string
    onChange?: (value: string) => void
    size?: SegmentSize
    variant?: SegmentVariant
    disabled?: boolean
  }
>(
  (
    {
      className,
      options,
      value,
      defaultValue,
      onChange,
      size = 'sm',
      variant = 'solid',
      disabled,
      ...rest
    },
    ref,
  ) => {
    return (
      <SegmentGroup.Root
        ref={ref}
        value={value}
        defaultValue={defaultValue ?? options[0]?.value}
        onValueChange={(e) => e.value && onChange?.(e.value)}
        disabled={disabled}
        className={cx(cls(), cls(size), cls(variant), className)}
        {...rest}>
        {options.map((option) => (
          <SegmentGroup.Item
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className={cls('item')}>
            <SegmentGroup.ItemText>{option.label}</SegmentGroup.ItemText>
            <SegmentGroup.ItemHiddenInput />
          </SegmentGroup.Item>
        ))}
        <SegmentGroup.Indicator className={cls('indicator')} />
      </SegmentGroup.Root>
    )
  },
)

const cls = classes(css`
  @layer local-components {
    & {
      width: fit-content;
      display: inline-flex;
      align-items: center;
      position: relative;
      background: var(--gray-bg);
      ${styles.borderRadius}
      padding: 3px;
      gap: 2px;
    }

    /* Size variants */
    &-sm {
      height: 24px;
      font-size: 12px;
    }
    &-md {
      height: 32px;
      font-size: 13px;
    }
    &-lg {
      height: 36px;
      font-size: 14px;
    }

    /* Variant: solid */
    &-solid &-indicator {
      background: var(--color);
    }
    &-solid &-item[data-state='checked'] {
      color: var(--color);
      background-color: white;
    }

    /* Variant: outline */
    &-outline {
      background: transparent;
      ${styles.border}
    }
    &-outline &-indicator {
      background: var(--gray-bg-hover);
    }
    &-outline &-item[data-state='checked'] {
      color: var(--color);
    }

    /* Item */
    &-item {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 12px;
      cursor: pointer;
      position: relative;
      z-index: 1;
      transition: all 0.2s ease;
      user-select: none;
      white-space: nowrap;
      height: 100%;
      border-radius: 4px;

      &:hover:not([data-state='checked']):not([data-disabled]) {
        color: var(--color);
      }

      &[data-disabled] {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }

    /* Indicator (sliding background) */
    &-indicator {
      position: absolute;
      height: calc(100% - 6px);
      ${styles.borderRadius}
      transition: left 0.2s ease, width 0.2s ease;
      z-index: 0;
    }

    /* Disabled state */
    &[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
`)
