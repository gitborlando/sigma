import RcInputNumber, { InputNumberProps } from '@rc-component/input-number'
import { Drag } from 'src/global/event/drag'

export interface InputNumProps extends Omit<
  InputNumberProps<number>,
  'prefix' | 'suffix' | 'onChange'
> {
  needFocusStyle?: boolean
  needAutoSelect?: boolean
  needControls?: boolean
  onChange?: (value: number) => void
  onEnd?: (value: number) => void
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
      needControls = true,
      suffix,
      prefix,
      onChange,
      onEnd,
      disabled,
      value,
      onFocus,
      onBlur,
      onPressEnter,
      formatter,
      parser,
      slideRate = 1,
      onSlide,
      afterSlide,
      ...rest
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>()
    const lastValue = useRef(value)
    const currentValue = useRef(value)

    useLayoutEffect(() => {
      lastValue.current = value
      currentValue.current = value
    }, [value])

    const handleChange = (val: number | null) => {
      if (val !== null) {
        currentValue.current = val
        onChange?.(val)
      }
    }

    const getFinalValue = () => {
      if (currentValue.current) {
        if (!parser) return currentValue.current
        return parser(currentValue.current.toString())
      }
    }

    const handleEnd = () => {
      const finalValue = getFinalValue()
      if (!finalValue) return
      if (finalValue === lastValue.current) return

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
          cls,
          needFocusStyle && `${cls}-focus-style`,
          disabled && `${cls}-disabled`,
          className,
        )}
        prefixCls={cls}
        classNames={{
          input: `${cls}-input`,
          prefix: `${cls}-prefix`,
          suffix: `${cls}-addon`,
        }}
        value={value}
        disabled={disabled}
        controls={needControls}
        prefix={
          onSlide ? (
            <SliderWrapperComp
              slideRate={slideRate}
              onSlide={onSlide}
              afterSlide={afterSlide}>
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
          handleEnd()
        }}
        onPressEnter={(e) => {
          onPressEnter?.(e)
          handleEnd()
          inputRef.current?.blur()
        }}
        onFocus={(e) => {
          onFocus?.(e)
          if (needAutoSelect) {
            inputRef.current?.select()
          }
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
  onSlide?: (value: number) => void
  afterSlide?: (changed: boolean) => void
}

const SliderWrapperComp: FC<
  InputNumSliderProps & {
    children: ReactNode
  }
> = observer(({ children, slideRate = 1, onSlide, afterSlide }) => {
  const handleDragLabel = () => {
    Drag.needInfinity()
      .onStart()
      .onMove(({ delta }) => onSlide?.((delta?.x ?? 0) * slideRate))
      .onDestroy(({ moved }) => afterSlide?.(moved))
  }
  return (
    <G
      onMouseDown={handleDragLabel}
      className={css`
        ${styles.fitContent}
        cursor: e-resize;
      `}>
      {children}
    </G>
  )
})

const cls = css`
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
`
