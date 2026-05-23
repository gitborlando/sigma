import { LucideProps as LucidePropsType } from 'lucide-react'

interface LucideProps extends LucidePropsType {
  icon: React.ForwardRefExoticComponent<any>
  active?: boolean
}

export const Lucide: FC<LucideProps> = observer(
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

const cls = classes(css`
  cursor: pointer;
  &[data-active='true'] {
    color: var(--color);
  }
`)
