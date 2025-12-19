import { matchCase } from '@gitborlando/utils'
import { ComponentPropsWithRef } from 'react'

export const Text: FC<
  ComponentPropsWithRef<'div'> & {
    variant?: 'label' | 'head' | 'common'
  }
> = observer(({ children, className, style, variant = 'label', ...rest }) => {
  const classes = matchCase(variant, {
    label: cls('label'),
    head: cls('head'),
    common: cls('common'),
  })
  return (
    <G
      className={cx('text', cls(), classes, className as string)}
      style={style}
      {...rest}>
      {children}
    </G>
  )
})

const cls = classes(css`
  @layer local-components {
    & {
      align-items: center;
      align-content: center;
    }
    &-label {
      ${styles.textLabel}
    }
    &-head {
      ${styles.textHead}
    }
    &-common {
      ${styles.textCommon}
    }
  }
`)
