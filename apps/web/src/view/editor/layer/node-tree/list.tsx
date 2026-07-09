import { useVirtualizer } from '@tanstack/react-virtual'
import Scrollbars from 'react-custom-scrollbars-2'
import { LayerNodeTreeItemComp } from 'src/view/editor/layer/node-tree/item'
import { useEditorServices } from 'src/view/hooks/editor'

export const LayerNodeTreeListComp: FC<{}> = observer(({}) => {
  const { layerNodeTree } = useEditorServices()
  const { nodeInfoList } = layerNodeTree
  const scrollBarsRef = useRef<Scrollbars>(null)

  const virtualizer = useVirtualizer({
    count: nodeInfoList.length,
    overscan: 0,
    estimateSize: () => 32,
    getItemKey: (index) => nodeInfoList[index].id,
    getScrollElement: () =>
      scrollBarsRef.current?.container?.firstElementChild || null,
  })

  return (
    <Scrollbars autoHide ref={scrollBarsRef} className={cls()}>
      <G style={{ height: nodeInfoList.length * 32 }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const nodeInfo = nodeInfoList[virtualItem.index]
          return (
            <G
              className={cls('item')}
              key={virtualItem.key}
              data-index={virtualItem.index}
              style={{ transform: `translateY(${virtualItem.start}px)` }}>
              <LayerNodeTreeItemComp nodeInfo={nodeInfo} />
            </G>
          )
        })}
      </G>
    </Scrollbars>
  )
})

const cls = classes(css`
  &-item {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 32px;
  }
`)
