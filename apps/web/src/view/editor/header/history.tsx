import { AnyObject, objectKey } from '@gitborlando/utils'
import { ChevronDown, ChevronUp, History } from 'lucide-react'
import Scrollbars from 'react-custom-scrollbars-2'
import { YUndoInfo } from 'src/editor/y-state/y-undo'
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
        title={t('common.history')}
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

    const patches = info.statePatches?.map((patch) => {
      if (Array.isArray(patch.keys)) {
        patch.keys = patch.keys.join('.') as any
      }
      return patch
    })

    useLayoutEffect(() => {
      if (!active) return
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, [active])

    const [showJson, setShowJson] = useState(false)

    return (
      <G ref={ref} vertical='auto 1fr' className={cls('item')} data-active={active}>
        <G horizontal='1fr auto' center className={cls('item-header')}>
          <Text>{info.description}</Text>
          <Btn
            x-if={patches}
            icon={<Lucide icon={showJson ? ChevronUp : ChevronDown} />}
            onClick={() => setShowJson(!showJson)}
          />
        </G>
        <G x-if={showJson && patches} className={cls('textarea')}>
          <JsonViewComp x-if={patches} json={patches!} />
        </G>
      </G>
    )
  },
)

const JsonViewComp: FC<{ json?: AnyObject | AnyObject[] }> = observer(({ json }) => {
  const renderValue = (value: any, indent: number = 0): string => {
    const indentStr = '  '.repeat(indent)

    if (value === null) return `${indentStr}null`
    if (value === undefined) return `${indentStr}undefined`

    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        if (value.length === 0) return `${indentStr}[]`
        const items = value.map((item) => renderValue(item, indent + 1)).join(',\n')
        return `${indentStr}[\n${items}\n${indentStr}]`
      } else {
        const entries = Object.entries(value)
        if (entries.length === 0) return `${indentStr}{}`
        const items = entries
          .map(([key, val]) => {
            return `${indentStr}  "${key}": ${renderValue(val, 0).trim()}`
          })
          .join(',\n')
        return `${indentStr}{\n${items}\n${indentStr}}`
      }
    }

    if (typeof value === 'string') return `${indentStr}"${value}"`
    return `${indentStr}${value}`
  }

  return (
    <G style={{ whiteSpace: 'pre', fontFamily: 'consolas' }}>{renderValue(json)}</G>
  )
})

const cls = classes(css`
  &-item {
    width: 100%;
    height: fit-content;
    padding-inline: 12px 6px;
    border-bottom: 1px solid var(--gray-border);
    ${styles.textLabel}
    justify-items: center;
    &-header {
      height: 36px;
    }
    &[data-active='true'] {
      background-color: var(--color-bg-half);
      color: var(--color);
    }
  }
  &-textarea {
    border: none;
    outline: none;
    resize: none;
    background-color: transparent;
    ${styles.textLabel}
  }
`)
