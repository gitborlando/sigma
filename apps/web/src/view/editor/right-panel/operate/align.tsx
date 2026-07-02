import { Icon } from '@gitborlando/widget'
import { Btn } from 'src/view/component/btn'
import { useEditorServices } from 'src/view/hooks/editor'

export const AlignComp: FC<{}> = observer(({}) => {
  const { designAlign } = useEditorServices()
  const { alignTypes, canAlign, setAlign } = designAlign

  return (
    <G center horizontal className={cls()}>
      {alignTypes.map((type) => (
        <Btn
          key={type}
          disabled={!canAlign}
          onClick={() => setAlign(type)}
          icon={<Icon url={Assets.editor.RP.design.align[type]} />}
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
