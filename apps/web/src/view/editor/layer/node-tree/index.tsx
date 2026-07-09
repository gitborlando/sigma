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
import { LayerNodeTreeHeaderComp } from 'src/view/editor/layer/node-tree/header'
import { LayerNodeTreeItemComp } from 'src/view/editor/layer/node-tree/item'
import { LayerNodeTreeListComp } from 'src/view/editor/layer/node-tree/list'
import { useEditorServices } from 'src/view/hooks/editor'

const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
}

export const LayerNodeTreeComp: FC<{}> = observer(({}) => {
  const { layerPageList, layerNodeTree } = useEditorServices()
  const { nodeInfoList } = layerNodeTree
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 32,
      },
    }),
  )

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
          style={{ height: innerHeight - 48 - layerPageList.panelHeight }}>
          <LayerNodeTreeHeaderComp />
          <LayerNodeTreeListComp />
        </G>
      </SortableContext>
      <DragOverlay dropAnimation={dropAnimationConfig}>
        {activeNodeInfo && (
          <G style={{ opacity: 0.8 }}>
            <LayerNodeTreeItemComp nodeInfo={activeNodeInfo} />
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
