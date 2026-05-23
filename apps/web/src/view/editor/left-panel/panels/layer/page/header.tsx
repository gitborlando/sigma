import { ChevronDown, Plus } from 'lucide-react'
import { HandlePage } from 'src/editor/handle/page'
import { Btn } from 'src/view/component/btn'
import { EditorLPLayerState } from 'src/view/editor/left-panel/panels/layer/state'
import { useSelectPage } from 'src/view/hooks/schema/use-y-state'

export const PageHeaderComp: FC<{}> = observer(({}) => {
  const { allPageExpanded } = EditorLPLayerState
  const selectPage = useSelectPage()
  const addPage = () => {
    EditorLPLayerState.allPageExpanded = allPageExpanded || true
    HandlePage.addPage()
  }

  return (
    <G center horizontal='1fr auto auto' gap={4} className={cls()}>
      <G center horizontal className={cls('title')}>
        {selectPage.name}
      </G>
      <Btn onClick={addPage} icon={<Lucide icon={Plus} />} />
      <Btn
        onClick={() => (EditorLPLayerState.allPageExpanded = !allPageExpanded)}
        icon={
          <Lucide
            icon={ChevronDown}
            style={{ rotate: allPageExpanded ? '0deg' : '180deg' }}
          />
        }
      />
    </G>
  )
})

const cls = classes(css`
  padding-inline: 12px 6px;
  height: 32px;
  &-title {
    ${styles.textLabel}
    color: gray;
  }
`)
