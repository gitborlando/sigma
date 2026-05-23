import { Is } from '@gitborlando/utils'
import { ComponentPropsWithRef, forwardRef } from 'react'
import { withCssVars } from 'src/view/styles/classes'

export interface DividerProps extends ComponentPropsWithRef<'div'> {
  orientation?: 'horizontal' | 'vertical'
  space?: number
  length?: string | number
}

export const Divider = forwardRef<HTMLHRElement, DividerProps>(
  (
    {
      className,
      orientation = 'horizontal',
      space = 6,
      length = '100%',
      style,
      ...rest
    },
    ref,
  ) => {
    const cls = classes(css`
      flex-shrink: 0;
      border: none;
      background-color: rgb(229, 230, 235);
      &[data-orientation='horizontal'] {
        width: var(--length);
        height: 0.5px;
        margin-block: var(--space);
      }
      &[data-orientation='vertical'] {
        width: 0.5px;
        height: var(--length);
        margin-inline: var(--space);
      }
    `)

    if (Is.number(length)) length = `${length}px`

    return (
      <hr
        ref={ref}
        data-orientation={orientation}
        className={cx(cls(), className)}
        style={withCssVars(style, { '--space': `${space}px`, '--length': length })}
        {...rest}
      />
    )
  },
)
