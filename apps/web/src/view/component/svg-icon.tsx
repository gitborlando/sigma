import { ReactSVG, type Props as ReactSVGProps } from 'react-svg'

export interface SvgIconProps extends ReactSVGProps {
  strokeWidth?: number
}

export const Icon = forwardRef<ReactSVG, SvgIconProps>(
  ({ beforeInjection, strokeWidth = 1.5, className, ...rest }, ref) => {
    const beforeInjectionRef = useRef(beforeInjection)
    beforeInjectionRef.current = beforeInjection

    const handleBeforeInjection: ReactSVGProps['beforeInjection'] = useCallback(
      (svg) => {
        svg.setAttribute('width', 'inherit')
        svg.setAttribute('height', 'inherit')
        svg.querySelectorAll('[stroke-width]').forEach((el) => {
          el.setAttribute('stroke-width', `${strokeWidth}`)
        })
        svg.querySelectorAll('[stroke]').forEach((el) => {
          if (el.getAttribute('stroke')?.toLowerCase() === 'none') return
          el.setAttribute('stroke', 'currentColor')
        })
        svg.querySelectorAll('[fill]').forEach((el) => {
          if (el.getAttribute('fill')?.toLowerCase() === 'none') return
          el.setAttribute('fill', 'currentColor')
        })
        beforeInjectionRef.current?.(svg)
      },
      [strokeWidth],
    )

    return (
      <ReactSVG
        wrapper='svg'
        useRequestCache
        ref={ref}
        className={cx(cls(), className, 'svg-icon')}
        beforeInjection={handleBeforeInjection}
        {...rest}
      />
    )
  },
)

const cls = classes(css`
  @layer local-components {
    width: 16px;
    height: 16px;
  }
`)
