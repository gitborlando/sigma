import type { LucideProps } from 'lucide-react'
import * as LucideReact from 'lucide-react'

const LucideComp: FC<
  LucideProps & { icon: React.ForwardRefExoticComponent<any>; active?: boolean }
> = observer(
  ({ icon: Icon, className, size = 16, strokeWidth = 1.5, active, ...rest }) => {
    return (
      <Icon
        className={cx(cls(), className)}
        {...rest}
        size={size}
        strokeWidth={strokeWidth}
        data-active={active}
      />
    )
  },
)

export const Lucide = Object.assign(LucideComp, LucideReact)

const cls = classes(css`
  cursor: pointer;
  &[data-active='true'] {
    color: var(--color);
  }
`)
