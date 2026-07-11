import { Btn } from 'src/view/component/btn'
import { Icon } from 'src/view/component/svg-icon'
import { useEditorServices } from 'src/view/hooks/editor'

export const DesignAlignComp: FC<{}> = observer(({}) => {
  const { designAlign } = useEditorServices()
  const { alignTypes, canAlign, setAlign } = designAlign

  return (
    <G center horizontal className={cls()}>
      {alignTypes.map((type) => (
        <Btn
          key={type}
          size={30}
          disabled={!canAlign}
          onClick={() => setAlign(type)}
          icon={<Icon src={Assets.editor.design.align[type]} />}
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
