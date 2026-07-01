import { ChevronsUp } from 'lucide-react'
import { Btn } from 'src/view/component/btn'

import { Lucide } from 'src/view/component/lucide'
import { useEditorServices } from 'src/view/hooks/editor'

export const EditorLeftPanelLayerNodeHeaderComp: FC<{}> = observer(({}) => {
  const { layerPanelNodeTree } = useEditorServices()
  const { hasNodeExpanded, toggleAllNodeExpanded } = layerPanelNodeTree
  const handleToggleExpand = () => {
    toggleAllNodeExpanded(!hasNodeExpanded)
  }

  return (
    <G horizontal='1fr auto' center className={cls()}>
      <input
        type='text'
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
              transform: hasNodeExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
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
