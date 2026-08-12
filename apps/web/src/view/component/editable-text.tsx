import { useUniformRef } from 'src/view/component/hooks'
import { Input } from 'src/view/component/input'

type EditableTextProps = ComponentPropsWithRef<'div'> & {
  canEdit: boolean
  value: string
  onEnd: (value: string) => void
  onDoubleClick?: () => void
}

export const EditableText = forwardRef<HTMLInputElement, EditableTextProps>(
  ({ canEdit, value, onEnd, onDoubleClick, className }, outRef) => {
    const ref = useUniformRef(outRef)

    useLayoutEffect(() => {
      canEdit && ref?.current?.focus()
    }, [canEdit])

    return (
      <G horizontal center className={cx(cls(), className)}>
        {canEdit ? (
          <Input
            ref={ref}
            className={'input'}
            needFocusStyle={false}
            value={value}
            validate={(text) => !!text}
            onEnd={(text) => onEnd?.(text!)}
          />
        ) : (
          <G
            horizontal
            center
            className={'div'}
            {...(onDoubleClick && { onDoubleClick })}>
            {value}
          </G>
        )}
      </G>
    )
  },
)

const cls = classes(css`
  @layer local-components {
    & .input,
    .div {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding-inline: 4px;
    }
  }
`)
