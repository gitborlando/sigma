import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { stopPropagation } from '@gitborlando/utils/browser'
import { ChevronRight } from 'lucide-react'
import { findNode } from 'src/editor/doc/finder'
import { DocHelper } from 'src/editor/doc/helper'
import { LayerNodeTreeInfo } from 'src/editor/workbench/layer/node-tree'
import { EditableText } from 'src/view/component/editable-text'
import { Lucide } from 'src/view/component/lucide'
import { Icon } from 'src/view/component/svg-icon'
import { useContextMenu } from 'src/view/features/context-menu'
import { useDoc } from 'src/view/hooks/use-doc'
import { useSelection } from 'src/view/hooks/use-selection'
import { useEditorServices } from 'src/view/hooks/use-services'
import { LayerNodeTreePathIcon } from './path-icon'

export const LayerNodeTreeItemComp: FC<{ nodeInfo: LayerNodeTreeInfo }> = observer(
  ({ nodeInfo }) => {
    const { command, layerNodeTree, stageEvent, selectAction, nodeAction } =
      useEditorServices()
    const { id, indent, ancestorIds } = nodeInfo
    const { toggleNodeExpanded, getNodeExpanded } = layerNodeTree
    const node = useDoc(() => findNode(id) as S.Node)
    const contextMenu = useContextMenu()

    const isParent = DocHelper.isParent(node)
    const expanded = !!getNodeExpanded(id)

    const selection = useSelection()
    const selected = selection[id]
    const subSelected = ancestorIds.some((ancestor) => selection[ancestor])

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
      useSortable({ id, disabled: false })

    const handleToggleExpand = stopPropagation(() => {
      toggleNodeExpanded(id, !expanded)
    })
    const select = () => {
      selectAction.onPanelSelect(id)
    }
    const handleDoubleClick = () => {
      selectAction.onPanelSelect(id)
      nodeAction.renamingNodeId = id
    }
    const handleMouseEnter = () => {
      stageEvent.hoverId = id
    }
    const handleMouseLeave = () => {
      stageEvent.hoverId = undefined
    }
    const handleOpenMenu = (e: React.MouseEvent) => {
      contextMenu.context = { id }
      contextMenu.menus = [command.nodeGroup, command.copyPasteGroup]
      contextMenu.open(e)
    }

    return (
      <G
        ref={setNodeRef}
        style={{
          transition,
          transform: CSS.Transform.toString(transform),
          opacity: isDragging ? 0.5 : 1,
          paddingLeft: 8 + indent * 16,
        }}
        gap={4}
        {...attributes}
        {...listeners}
        horizontal='auto auto 1fr auto'
        center
        data-hover={stageEvent.hoverId === id}
        data-selected={selected}
        data-sub-selected={subSelected}
        data-dragging={isDragging}
        className={cls()}
        onMouseDown={select}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleOpenMenu}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}>
        <Lucide
          x-if={isParent}
          size={14}
          icon={ChevronRight}
          onClick={handleToggleExpand}
          onMouseDown={stopPropagation()}
          style={{
            visibility: isParent && node.childIds.length ? 'visible' : 'hidden',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        />
        {!isParent && <G style={{ width: 12, height: 12 }} />}
        {node.variant === 'path' ? (
          <LayerNodeTreePathIcon node={node} />
        ) : (
          <Icon
            src={Assets.editor.node[node.variant as keyof typeof Assets.editor.node]}
          />
        )}
        <EditableText
          canEdit={nodeAction.renamingNodeId === id}
          value={node.name || '未命名'}
          onEnd={(name) => nodeAction.renameNode(id, name)}
        />
      </G>
    )
  },
)

const cls = classes(css`
  width: 100%;
  height: 32px;
  cursor: pointer;
  ${styles.needBorder}
  ${styles.textLabel}
  ${styles.borderHoverPrimary}
  &[data-hover='true'] {
    ${styles.borderPrimary}
  }
  &[data-selected='true'] {
    ${styles.bgPrimary}
  }
  &[data-sub-selected='true'] {
    background-color: var(--color-bg-half);
  }
  &[data-dragging='true'] {
    opacity: 0.5;
  }
`)
