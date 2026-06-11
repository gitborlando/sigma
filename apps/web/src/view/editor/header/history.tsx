import { objectKey } from '@gitborlando/utils'
import { History } from 'lucide-react'
import Scrollbars from 'react-custom-scrollbars-2'
import type { YUndoInfo } from 'src/editor/y-state/y-undo'
import { Btn } from 'src/view/component/btn'
import { DragPanel } from 'src/view/component/drag-panel'
import { Text } from 'src/view/component/text'

export const EditorHeaderHistoryComp: FC<{}> = observer(({}) => {
  const [showHistory, setShowHistory] = useState(false)
  const { next, stack } = YUndo
  return (
    <>
      <Btn
        size={32}
        icon={<Lucide icon={History} size={20} />}
        onClick={() => setShowHistory(!showHistory)}
      />
      <DragPanel
        center
        x-if={showHistory}
        title={t('history')}
        closeFunc={() => setShowHistory(false)}
        height={innerHeight * 0.8}>
        <Scrollbars>
          {stack.map((info, i) => (
            <HistoryItemComp
              key={objectKey(info)}
              info={info}
              active={next === i + 1}
            />
          ))}
        </Scrollbars>
      </DragPanel>
    </>
  )
})

const HistoryItemComp: FC<{ info: YUndoInfo; active: boolean }> = observer(
  ({ info, active }) => {
    const ref = useRef<HTMLDivElement>(null)

    useLayoutEffect(() => {
      if (!active) return
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, [active])

    return (
      <G
        ref={ref}
        className={cls('item')}
        data-active={active}
        onClick={() => console.log('undoInfo', info)}>
        <Text>{info.description}</Text>
      </G>
    )
  },
)

const cls = classes(css`
  &-item {
    width: 100%;
    height: 36px;
    padding-inline: 12px;
    border-bottom: 1px solid var(--gray-border);
    ${styles.textLabel}
    align-content: center;
    justify-items: start;
    cursor: pointer;
    &[data-active='true'] {
      background-color: var(--color-bg-half);
      color: var(--color);
    }
  }
`)
