import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { stopPropagation } from '@gitborlando/utils/browser'
import { ChevronRight } from 'lucide-react'
import { SchemaHelper } from 'src/editor/schema/helper'
import { LayerNodeTreeInfo } from 'src/editor/workbench/layer/node-tree'
import { ContextMenu } from 'src/global/context-menu'
import { Input } from 'src/view/component/input'
import { Lucide } from 'src/view/component/lucide'
import { Icon } from 'src/view/component/svg-icon'
import { useEditorServices } from 'src/view/hooks/editor'
import { useSelection } from 'src/view/hooks/schema/use-y-client'
import { useSchema } from 'src/view/hooks/schema/use-y-state'
import { LayerNodeTreePathIcon } from './path-icon'

export const LayerNodeTreeItemComp: FC<{ nodeInfo: LayerNodeTreeInfo }> = observer(
  ({ nodeInfo }) => {
    const { command, layerNodeTree, stageEvent, selectAction, nodeAction } =
      useEditorServices()
    const { id, indent, ancestorIds } = nodeInfo
    const { toggleNodeExpanded, getNodeExpanded } = layerNodeTree
    const node = useSchema((schema) => schema[id] as S.Node)

    const isParent = SchemaHelper.isNodeParent(node)
    const expanded = getNodeExpanded(id)

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
    const handleContextMenu = (e: React.MouseEvent) => {
      ContextMenu.context = { id }
      ContextMenu.menus = [command.nodeGroup, command.copyPasteGroup]
      ContextMenu.openMenu(e)
    }
    const handleMouseEnter = () => {
      stageEvent.hoverId = id
    }
    const handleMouseLeave = () => {
      stageEvent.hoverId = undefined
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
        onContextMenu={handleContextMenu}
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
        {node.type === 'path' ? (
          <LayerNodeTreePathIcon node={node} />
        ) : (
          <Icon
            src={Assets.editor.node[node.type as keyof typeof Assets.editor.node]}
          />
        )}
        <RenameComp node={node} />
      </G>
    )
  },
)

const RenameComp: FC<{ node: S.Node }> = observer(({ node }) => {
  const ref = useRef<HTMLInputElement>(null)
  const { nodeAction } = useEditorServices()
  const { renamingNodeId } = nodeAction
  const canRename = renamingNodeId === node.id

  useLayoutEffect(() => {
    canRename && ref.current?.focus()
  }, [canRename])

  return canRename ? (
    <Input
      ref={ref}
      className={renameCls()}
      needFocusStyle={false}
      value={node.name || '未命名'}
      validate={(name) => !!name}
      onBlur={() => (nodeAction.renamingNodeId = '')}
      onEnd={(name) => {
        nodeAction.renameNode(node.id, name!)
        nodeAction.renamingNodeId = ''
      }}
    />
  ) : (
    <G className={renameCls()}>{node.name || '未命名'}</G>
  )
})

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

const renameCls = classes(css`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-inline: 4px;
`)
