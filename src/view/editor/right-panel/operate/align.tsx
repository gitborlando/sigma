import { Icon } from '@gitborlando/widget'
import { OperateAlign } from 'src/editor/operate/align'
import { useHookSignal } from 'src/shared/signal/signal-react'
import { Btn } from 'src/view/component/btn'

export const AlignComp: FC<{}> = observer(({}) => {
  const { alignTypes, canAlign, currentAlign } = OperateAlign
  useHookSignal(canAlign)

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
