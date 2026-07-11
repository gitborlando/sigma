import { Dragger } from '@gitborlando/toolkit/browser'
import RcInputNumber, { InputNumberProps } from '@rc-component/input-number'

type InputNumSpecialValue = string | symbol

export interface InputNumProps<
  SpecialValue extends InputNumSpecialValue = never,
> extends Omit<
  InputNumberProps<number>,
  'prefix' | 'suffix' | 'value' | 'onChange'
> {
  needFocusStyle?: boolean
  needAutoSelect?: boolean
  needControls?: boolean
  value?: number | SpecialValue | Nil
  suffix?: ReactNode
  prefix?: ReactNode
  specialValue?: {
    value: SpecialValue
    label: string
  }
  onChange?: (value: number | SpecialValue | Nil) => void
  onEnd?: (value: number | SpecialValue | Nil) => void
}

type InputNumComp = <SpecialValue extends InputNumSpecialValue = never>(
  props: InputNumProps<SpecialValue> &
    InputNumSliderProps & { ref?: React.ForwardedRef<HTMLInputElement> },
) => ReactNode

export const InputNum = forwardRef<
  HTMLInputElement,
  InputNumProps<InputNumSpecialValue> & InputNumSliderProps
>(
  (
    {
      className,
      needFocusStyle = true,
      needAutoSelect = true,
      needControls = false,
      suffix,
      prefix,
      onChange,
      onEnd,
      disabled,
      value,
      specialValue,
      placeholder,
      onFocus,
      onBlur,
      onPressEnter,
      onStep,
      formatter,
      parser,
      slideRate = 1,
      beforeSlide,
      onSlide,
      afterSlide,
      ...rest
    },
    ref,
  ) => {
    const isSpecialValue = specialValue !== undefined && value === specialValue.value
    const inputValue = isSpecialValue ? undefined : (value as number | Nil)
    const inputRef = useRef<HTMLInputElement>()
    const state = useRef({
      lastValue: value,
      curValue: value,
      isFocusing: false,
      isSliding: false,
    }).current

    useLayoutEffect(() => {
      state.curValue = value

      if (!state.isFocusing && !state.isSliding) {
        state.lastValue = value
      }
    }, [value])

    const handleChange = (value: number | Nil) => {
      state.curValue = value
      onChange?.(value)
    }

    const handleEnd = (changed = !Object.is(state.curValue, state.lastValue)) => {
      if (!changed) return

      state.lastValue = state.curValue
      onEnd?.(state.curValue)
    }

    return (
      <RcInputNumber
        ref={(r) => {
          if (typeof ref === 'function') ref(r)
          else if (ref) ref.current = r
          inputRef.current = r ?? undefined
        }}
        className={cx(
          cls(),
          needFocusStyle && cls('focus-style'),
          disabled && cls('disabled'),
          className,
        )}
        prefixCls={cls()}
        classNames={{
          input: cls('input'),
          prefix: cls('prefix'),
          suffix: cls('addon'),
        }}
        value={inputValue}
        placeholder={isSpecialValue ? specialValue.label : placeholder}
        disabled={disabled}
        controls={needControls}
        prefix={
          onSlide ? (
            <SliderWrapperComp
              slideRate={slideRate}
              beforeSlide={() => {
                state.isSliding = true
                beforeSlide?.()
              }}
              onSlide={onSlide}
              afterSlide={(changed) => {
                state.isSliding = false
                afterSlide?.(changed)
                handleEnd(changed)
              }}>
              {prefix}
            </SliderWrapperComp>
          ) : (
            prefix
          )
        }
        suffix={suffix}
        onChange={handleChange}
        onBlur={(e) => {
          onBlur?.(e)
          queueMicrotask(() => {
            handleEnd()
            state.isFocusing = false
          })
        }}
        onPressEnter={(e) => {
          onPressEnter?.(e)
          handleEnd()
          inputRef.current?.blur()
        }}
        onFocus={(e) => {
          state.isFocusing = true
          onFocus?.(e)
          if (needAutoSelect) {
            inputRef.current?.select()
          }
        }}
        onStep={(stepValue, info) => {
          onStep?.(stepValue, info)
          handleEnd()
        }}
        formatter={isSpecialValue ? () => '' : formatter}
        parser={parser}
        {...rest}
      />
    )
  },
) as InputNumComp

interface InputNumSliderProps {
  slideRate?: number
  beforeSlide?: () => void
  onSlide?: (value: number) => void
  afterSlide?: (changed: boolean) => void
}

const SliderWrapperComp: FC<
  InputNumSliderProps & {
    children: ReactNode
  }
> = observer(({ children, slideRate = 1, beforeSlide, onSlide, afterSlide }) => {
  const cls = css`
    ${styles.fitContent}
    cursor: e-resize;
  `

  const handleMouseDown = (e: React.MouseEvent) => {
    new Dragger({})
      .needInfinity()
      .onStart(() => beforeSlide?.())
      .onMove(({ delta }) => onSlide?.((delta?.x ?? 0) * slideRate))
      .onDestroy(({ moved }) => afterSlide?.(moved))
      .start(e)
  }

  return (
    <G onMouseDown={handleMouseDown} className={cls}>
      {children}
    </G>
  )
})

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
      color: rgba(0, 0, 0, 0.65);
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
        color: rgba(0, 0, 0, 0.35);
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
