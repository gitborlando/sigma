import Scrollbars from 'react-custom-scrollbars-2'
import { Drag } from 'src/global/event/drag'
import { useEditorServices } from 'src/view/hooks/editor'
import { useSchema } from 'src/view/hooks/schema/use-y-state'
import { LayerPageListHeaderComp } from './header'
import { LayerPageListItemComp } from './item'

export const LayerPageListComp: FC<{}> = observer(({}) => {
  const { layerPageList, yState } = useEditorServices()
  const { panelHeight, isCollapsed } = layerPageList
  const meta = useSchema((schema) => schema.meta)

  return (
    <G vertical className={cls()}>
      <LayerPageListHeaderComp />
      <G
        vertical
        className={cls('content')}
        x-if={!isCollapsed}
        style={{ height: panelHeight - 37 }}>
        <Scrollbars style={{ height: panelHeight - 37 }}>
          {meta.pageIds.map((id) => {
            const page = yState.find<S.Page>(id)
            return (
              <LayerPageListItemComp key={page.id} name={page.name} id={page.id} />
            )
          })}
        </Scrollbars>
      </G>
      <G
        className={cls('resize')}
        x-if={!isCollapsed}
        onMouseDown={() => {
          let lastHeight = panelHeight
          Drag.onMove(({ shift }) => {
            let newHeight = lastHeight + shift.y
            if (newHeight <= 69 || newHeight >= 800) return
            layerPageList.panelHeight = newHeight
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
