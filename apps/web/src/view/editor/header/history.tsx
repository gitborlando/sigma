import { objectId } from '@gitborlando/utils'
import { Braces, Copy, History } from 'lucide-react'
import Scrollbars from 'react-custom-scrollbars-2'
import type { UndoInfo } from 'src/editor/core/undo'
import { Undo } from 'src/editor/core/undo'
import { HandlePage } from 'src/editor/handle/page'
import { getSelectPageId, getSetting } from 'src/editor/utils/get'
import { BalanceItem, OptionBalanceItem } from 'src/view/component/balance-item'
import { Btn } from 'src/view/component/btn'
import { DragPanel } from 'src/view/component/drag-panel'
import { Lucide } from 'src/view/component/lucide'
import { Text } from 'src/view/component/text'

export const EditorHeaderHistoryComp: FC<{}> = observer(({}) => {
  const [showHistory, setShowHistory] = useState(false)
  const { next, stack } = Undo
  return (
    <>
      <Btn
        size={32}
        icon={<Lucide icon={History} size={20} />}
        onClick={() => setShowHistory(!showHistory)}
      />
      <DragPanel
        id='history'
        show={showHistory}
        center
        title={t('history')}
        showFunc={setShowHistory}
        headerSlot={
          isDEV && (
            <Btn
              size={24}
              title='Print current schema'
              icon={<Lucide icon={Braces} />}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => HandlePage.DEV_logPageSchema(getSelectPageId())}
            />
          )
        }
        menuSlot={
          isDEV && (
            <OptionBalanceItem
              label='Log undo/redo info'
              checked={getSetting().dev.logUndoRedoInfo}
              onChecked={(value) => (getSetting().dev.logUndoRedoInfo = value)}
            />
          )
        }
        height={innerHeight * 0.8}>
        <Scrollbars>
          {stack.map((info, i) => (
            <HistoryItemComp
              key={objectId(info)}
              info={info}
              active={next === i + 1}
            />
          ))}
        </Scrollbars>
      </DragPanel>
    </>
  )
})

const HistoryItemComp: FC<{ info: UndoInfo; active: boolean }> = observer(
  ({ info, active }) => {
    const ref = useRef<HTMLDivElement>(null)

    useLayoutEffect(() => {
      if (!active) return
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, [active])

    const copyDescription = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      navigator.clipboard.writeText(info.description)
    }

    return (
      <BalanceItem
        ref={ref}
        className={cls('item')}
        data-active={active}
        left={<Text>{info.description}</Text>}
        right={
          <Btn
            className={cls('copy')}
            size={24}
            title={t('copy')}
            icon={<Lucide icon={Copy} size={14} />}
            onClick={copyDescription}
          />
        }
        onClick={() => console.log('undoInfo', info)}
      />
    )
  },
)

const cls = classes(css`
  &-item {
    width: 100%;
    height: 36px;
    padding-inline: 12px 8px;
    border-bottom: 1px solid var(--gray-border);
    ${styles.textLabel}
    cursor: pointer;
    &[data-active='true'] {
      background-color: var(--color-bg-half);
      color: var(--color);
    }
  }
  &-copy {
    opacity: 0;
    pointer-events: none;
  }
  &-item:hover &-copy {
    opacity: 1;
    pointer-events: auto;
  }
`)
