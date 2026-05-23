import { objectKey } from '@gitborlando/utils'
import Scrollbars from 'react-custom-scrollbars-2'
import { Text } from 'src/view/component/text'

export const UndoComp: FC<{}> = observer(({}) => {
  const { next, stack } = YUndo

  return (
    <Scrollbars>
      {stack.map((item, i) => (
        <G className={cls()} key={objectKey(item)} data-active={next === i + 1}>
          <Text active={next === i + 1}>{`[${item.type}] ${item.description}`}</Text>
        </G>
      ))}
    </Scrollbars>
  )
})

const cls = classes(css`
  width: 100%;
  height: 32px;
  align-content: center;
  padding-left: 8px;
  &[data-active='true'] {
    ${styles.bgPrimary}
  }
`)
