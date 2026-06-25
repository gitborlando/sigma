import { useSignal } from '@gitborlando/signal/react'
import { Icon } from '@gitborlando/widget'
import { OperateAlign } from 'src/editor'
import { Btn } from 'src/view/component/btn'

export const AlignComp: FC<{}> = observer(({}) => {
  const { alignTypes, canAlign, currentAlign } = OperateAlign
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
