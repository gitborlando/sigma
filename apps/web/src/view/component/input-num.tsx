import RcInputNumber, { InputNumberProps } from '@rc-component/input-number'
import { Dragger } from '@gitborlando/toolkit/browser'
import { isNumber, isUndefined } from 'es-toolkit'

export interface InputNumProps extends Omit<
  InputNumberProps<number>,
  'prefix' | 'suffix' | 'onChange'
> {
  needFocusStyle?: boolean
  needAutoSelect?: boolean
  needControls?: boolean
  onChange?: (value: number | null) => void
  onEnd?: (value: number | null) => void
  suffix?: ReactNode
  prefix?: ReactNode
}

export const InputNum = forwardRef<
  HTMLInputElement,
  InputNumProps & InputNumSliderProps
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
    const inputRef = useRef<HTMLInputElement>()
    const lastValue = useRef(value)
    const currentValue = useRef(value)
    const isFocusing = useRef(false)
    const isSliding = useRef(false)
    const slideStartValue = useRef<number | null>()

    useLayoutEffect(() => {
      currentValue.current = value
      if (!isFocusing.current && !isSliding.current) {
        lastValue.current = value
      }
    }, [value])

    const handleChange = (val: number | null) => {
      currentValue.current = val
      onChange?.(val)
    }

    const handleEnd = (last = lastValue.current) => {
      const finalValue = currentValue.current
      if (isUndefined(finalValue)) return
      if (Object.is(finalValue, last)) return

      lastValue.current = finalValue
      onEnd?.(finalValue)
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
        value={value}
        disabled={disabled}
        controls={needControls}
        prefix={
          onSlide ? (
            <SliderWrapperComp
              slideRate={slideRate}
              beforeSlide={() => {
                isSliding.current = true
                slideStartValue.current = currentValue.current
                beforeSlide?.()
              }}
              onSlide={(value) => {
                if (isNumber(currentValue.current)) {
                  currentValue.current += value
                }
                onSlide?.(value)
              }}
              afterSlide={(changed) => {
                isSliding.current = false
                afterSlide?.(changed)
                handleEnd(slideStartValue.current)
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
            isFocusing.current = false
          })
        }}
        onPressEnter={(e) => {
          onPressEnter?.(e)
          handleEnd()
          inputRef.current?.blur()
        }}
        onFocus={(e) => {
          isFocusing.current = true
          onFocus?.(e)
          if (needAutoSelect) {
            inputRef.current?.select()
          }
        }}
        onStep={(stepValue, info) => {
          onStep?.(stepValue, info)
          handleEnd()
        }}
        formatter={formatter}
        parser={parser}
        {...rest}
      />
    )
  },
)

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
      transition: all 0.15s ease;
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
