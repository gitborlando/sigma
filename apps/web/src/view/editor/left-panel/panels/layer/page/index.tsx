import Scrollbars from 'react-custom-scrollbars-2'
import { Drag } from 'src/global/event/drag'
import { EditorLPLayerState } from 'src/view/editor/left-panel/panels/layer/state'
import { useSchema } from 'src/view/hooks/schema/use-y-state'
import { PageHeaderComp } from './header'
import { PageItemComp } from './item'

export const PageComp: FC<{}> = observer(({}) => {
  const { pagePanelHeight, allPageExpanded } = EditorLPLayerState
  const meta = useSchema((schema) => schema.meta)

  return (
    <G vertical className={cls()}>
      <PageHeaderComp />
      <G
        vertical
        className={cls('content')}
        x-if={allPageExpanded}
        style={{ height: pagePanelHeight - 37 }}>
        <Scrollbars style={{ height: pagePanelHeight - 37 }}>
          {meta.pageIds.map((id) => {
            const page = YState.find<IPage>(id)
            return <PageItemComp key={page.id} name={page.name} id={page.id} />
          })}
        </Scrollbars>
      </G>
      <G
        className={cls('resize')}
        x-if={allPageExpanded}
        onMouseDown={() => {
          let lastHeight = pagePanelHeight
          Drag.onMove(({ shift }) => {
            let newHeight = lastHeight + shift.y
            if (newHeight <= 69 || newHeight >= 800) return
            EditorLPLayerState.pagePanelHeight = newHeight
          }).start()
        }}></G>
    </G>
  )
})

const cls = classes(css`
  width: 240px;
  height: 100%;
  ${styles.borderBottom}
  &-content {
    overflow-y: auto;
    align-content: start;
  }
  &-resize {
    cursor: ns-resize;
  }
`)
