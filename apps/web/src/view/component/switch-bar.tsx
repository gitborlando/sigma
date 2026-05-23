export const SwitchBar = forwardRef<
  HTMLDivElement,
  ComponentPropsWithRef<'div'> & {
    options: { label: string; value: string }[]
    value: string
    onChange: (value: string) => void
  }
>(({ className, options, value, onChange, ...rest }, ref) => {
  return (
    <G horizontal center className={cls()} {...rest} ref={ref}>
      {options.map((option) => (
        <G
          data-active={value === option.value}
          key={option.value}
          className={cls('option')}
          onClick={() => onChange(option.value)}>
          {option.label}
        </G>
      ))}
    </G>
  )
})

const cls = classes(css`
  padding: 12px;
  justify-content: start;
  gap: 16px;
  &-option {
    width: fit-content;
    font-size: 13px;
    color: #999999;
    cursor: pointer;
    font-weight: 600;
    &:hover {
      color: #4b4b4b;
    }
    &[data-active='true'] {
      color: var(--color);
    }
  }
`)
