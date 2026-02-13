import {
  closestCenter,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  DropAnimation,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useState } from 'react'
import { useHookSignal } from 'src/utils/signal-react'
import { EditorLeftPanelLayerNodeHeaderComp } from 'src/view/editor/left-panel/panels/layer/node/header'
import { EditorLeftPanelLayerNodeItemComp } from 'src/view/editor/left-panel/panels/layer/node/item'
import { EditorLeftPanelLayerNodeListComp } from 'src/view/editor/left-panel/panels/layer/node/list'
import { EditorLPLayerNodeState } from 'src/view/editor/left-panel/panels/layer/node/state'
import { EditorLPLayerState } from 'src/view/editor/left-panel/panels/layer/state'

const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
}

export const EditorLeftPanelLayerNodeComp: FC<{}> = observer(({}) => {
  const { nodeInfoChanged, getNodeInfoList } = EditorLPLayerNodeState
  const [activeId, setActiveId] = useState<string | null>(null)
  useHookSignal(nodeInfoChanged)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 32,
      },
    }),
  )

  const nodeInfoList = getNodeInfoList()
  const activeNodeInfo = nodeInfoList.find((info) => info.id === activeId)

  const handleDragStart = (event: any) => {
    const { active } = event
    setActiveId(active.id)
  }

  const handleDragEnd = (event: any) => {
    const { active, over } = event

    setActiveId(null)

    if (!over) {
      return
    }

    const activeId = active.id
    const overId = over.id

    if (activeId === overId) {
      return
    }
  }

  const handleDragCancel = () => {
    setActiveId(null)
  }

  useEffect(() => EditorLPLayerNodeState.init(), [])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}>
      <SortableContext items={nodeInfoList} strategy={verticalListSortingStrategy}>
        <G
          vertical='auto 1fr'
          className={cls()}
          style={{ height: innerHeight - 48 - EditorLPLayerState.pagePanelHeight }}>
          <EditorLeftPanelLayerNodeHeaderComp />
          <EditorLeftPanelLayerNodeListComp />
        </G>
      </SortableContext>
      <DragOverlay dropAnimation={dropAnimationConfig}>
        {activeNodeInfo && (
          <G style={{ opacity: 0.8 }}>
            <EditorLeftPanelLayerNodeItemComp nodeInfo={activeNodeInfo} />
          </G>
        )}
      </DragOverlay>
    </DndContext>
  )
})

const cls = classes(css`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`)
