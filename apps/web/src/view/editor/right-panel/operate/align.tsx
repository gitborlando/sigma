import { useSignal } from '@gitborlando/signal/react'
import { Icon } from '@gitborlando/widget'
import { Btn } from 'src/view/component/btn'
import { useEditorService } from 'src/view/hooks/editor'

export const AlignComp: FC<{}> = observer(({}) => {
  const { alignTypes, canAlign, currentAlign } = useEditorService('operateAlign')
  useSignal(canAlign)

  return (
    <G center horizontal className={cls()}>
      {alignTypes.map((type) => (
        <Btn
          key={type}
          disabled={!canAlign.value}
          onClick={() => currentAlign.dispatch(type)}
          icon={<Icon url={Assets.editor.RP.operate.align[type]} />}
        />
      ))}
    </G>
  )
})

const cls = classes(css`
  height: 40px;
  justify-items: center;
  ${styles.borderBottom}
  & .g-icon {
    width: 16px;
    height: 16px;
  }
`)
