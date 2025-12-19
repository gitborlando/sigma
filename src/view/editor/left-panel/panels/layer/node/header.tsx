import { ChevronsUp } from 'lucide-react'
import { useHookSignal } from 'src/shared/signal/signal-react'
import { Btn } from 'src/view/component/btn'

import { EditorLPLayerNodeState } from 'src/view/editor/left-panel/panels/layer/node/state'

export const EditorLeftPanelLayerNodeHeaderComp: FC<{}> = observer(({}) => {
  const { nodeInfoChanged, getAllNodeExpanded, toggleAllNodeExpanded } =
    EditorLPLayerNodeState
  useHookSignal(nodeInfoChanged)

  const allNodeExpanded = getAllNodeExpanded()

  const handleToggleExpand = () => {
    toggleAllNodeExpanded(!allNodeExpanded)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
  }

  const handleClearSearch = () => {}

  return (
    <G horizontal='1fr auto' center className={cls()}>
      <input
        type='text'
        // value={searchSlice.value}
        // onChange={handleSearchChange}
        placeholder={t('search layer')}
        className={cls('search-input')}
      />
      <Btn
        onClick={handleToggleExpand}
        className={cls('expand-button')}
        icon={
          <Lucide
            icon={ChevronsUp}
            style={{
              transform: allNodeExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        }
      />
    </G>
  )
})

const cls = classes(css`
  width: 100%;
  height: 32px;
  min-height: 32px;
  padding-inline: 12px 6px;
  padding-block: 0;
  gap: 8px;
  &-expand-button {
    flex-shrink: 0;
    transition: transform 0.2s;
  }
  &-search-input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    ${styles.textLabel}
    &::placeholder {
      font-size: 12px;
    }
  }
`)
