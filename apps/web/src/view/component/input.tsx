import { ComponentPropsWithoutRef } from 'react'

export interface InputProps extends Omit<
  ComponentPropsWithoutRef<'input'>,
  'prefix' | 'suffix' | 'value' | 'defaultValue' | 'onChange'
> {
  needFocusStyle?: boolean
  needAutoSelect?: boolean
  value?: string | Nil
  defaultValue?: string
  prefix?: ReactNode
  suffix?: ReactNode
  validate?: (value: string) => boolean
  onChange?: (value: string) => void
  onEnd?: (value: string | Nil) => void
  onPressEnter?: (event: React.KeyboardEvent<HTMLInputElement>) => void
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      needFocusStyle = true,
      needAutoSelect = true,
      value,
      defaultValue = '',
      prefix,
      suffix,
      disabled,
      validate,
      onChange,
      onEnd,
      onFocus,
      onBlur,
      onKeyDown,
      onPressEnter,
      ...rest
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>()
    const [inputValue, setInputValue] = useState(value ?? defaultValue)
    const state = useRef({
      lastValue: value ?? defaultValue,
      curValue: value ?? defaultValue,
    }).current

    useLayoutEffect(() => {
      if (value === undefined) return

      const nextValue = value ?? ''
      state.curValue = nextValue
      state.lastValue = nextValue
      setInputValue(nextValue)
    }, [value])

    const handleEnd = () => {
      if (Object.is(state.curValue, state.lastValue)) return

      if (validate && !validate(state.curValue)) {
        state.curValue = state.lastValue
        setInputValue(state.lastValue)
        return
      }

      state.lastValue = state.curValue
      onChange?.(state.curValue)
      onEnd?.(state.curValue)
    }

    return (
      <label
        className={cx(
          cls(),
          needFocusStyle && cls('focus-style'),
          disabled && cls('disabled'),
          className,
        )}>
        {prefix && <span className={cls('prefix')}>{prefix}</span>}
        <input
          ref={(node) => {
            if (typeof ref === 'function') ref(node)
            else if (ref) ref.current = node
            inputRef.current = node ?? undefined
          }}
          className={cls('input')}
          value={inputValue}
          disabled={disabled}
          onChange={(event) => {
            state.curValue = event.target.value
            setInputValue(event.target.value)
          }}
          onBlur={(event) => {
            onBlur?.(event)
            queueMicrotask(() => {
              handleEnd()
            })
          }}
          onFocus={(event) => {
            onFocus?.(event)
            if (needAutoSelect) inputRef.current?.select()
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event)
            if (event.key !== 'Enter' || event.defaultPrevented) return

            onPressEnter?.(event)
            handleEnd()
            inputRef.current?.blur()
          }}
          {...rest}
        />
        {suffix && <span className={cls('addon')}>{suffix}</span>}
      </label>
    )
  },
)

const cls = classes(css`
  @layer local-components {
    & {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      height: 30px;
      padding: 0 8px;
      transition:
        background-color 0.15s ease,
        color 0.15s ease;
      ${styles.borderRadius}
    }

    &-focus-style {
      background: var(--gray-bg);
      &:focus-within {
        background: white;
        outline: 1px solid var(--color);
      }
    }

    &-disabled {
      opacity: 0.4;
      cursor: not-allowed;
      pointer-events: none;
    }

    &-prefix {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    &-input {
      flex: 1;
      width: 100%;
      min-width: 0;
      border: none;
      outline: none;
      background: transparent;
      font-size: 12px;
      color: inherit;
      &::placeholder {
        color: rgba(0, 0, 0, 0.65);
      }
    }

    &-addon {
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
      font-size: 12px;
      color: rgba(0, 0, 0, 0.45);
    }
  }
`)
