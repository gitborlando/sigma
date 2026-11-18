import { normalizeAiEdit } from '../../../editor/ai/normalize-edit'
import type { AiFill, AiSnapshotNode } from '../../../editor/ai/schema'
import { useEditorServices } from '../../hooks/use-services'

type PreviewNode = AiSnapshotNode & { parentId: string }

export const AiPreviewComp = observer(() => {
  const { aiPreview, stageViewport, select } = useEditorServices()
  if (!aiPreview.active) return null
  const { target, snapshot } = aiPreview
  if (target === 'current' && select.selectPageId !== snapshot?.pageId) return null
  const pageId = snapshot?.pageId || '@page'
  const result = normalizeAiEdit(
    { operations: aiPreview.operations },
    pageId,
    target,
  )
  const nodes = new Map<string, PreviewNode>()
  snapshot?.nodes.forEach((node) => nodes.set(node.id, { ...node }))
  const visible = new Set<string>()
  for (const op of result.operations) {
    if (op.op === 'create') {
      nodes.set(op.id, {
        ...op.node,
        id: op.id,
        parentId: op.parentId,
        name: op.node.name || '',
        text: op.node.text
          ? {
              content: op.node.text.content,
              fontSize: op.node.text.fontSize || 16,
              fontWeight: op.node.text.fontWeight || 400,
              lineHeight: op.node.text.lineHeight || 20,
              align: op.node.text.align || 'left',
            }
          : undefined,
        stroke: op.node.stroke || undefined,
        shadow: op.node.shadow || undefined,
      })
      visible.add(op.id)
    } else if (op.op === 'update') {
      const node = nodes.get(op.id)
      if (!node) continue
      const { text, ...changes } = op.changes
      Object.assign(node, changes)
      if (text && node.text) node.text = { ...node.text, ...text }
      visible.add(op.id)
    } else {
      visible.delete(op.id)
      nodes.delete(op.id)
    }
  }
  const position = (node: PreviewNode) => {
    let x = node.x || 0,
      y = node.y || 0,
      parent = nodes.get(node.parentId),
      depth = 0
    while (parent && depth++ < 8) {
      x += parent.x || 0
      y += parent.y || 0
      parent = nodes.get(parent.parentId)
    }
    return { x, y }
  }
  const created = [...visible]
    .map((id) => nodes.get(id))
    .filter((node): node is PreviewNode => !!node && node.type !== 'unsupported')
  const root = created.find(
    (node) => node.parentId === '@page' || node.parentId === pageId,
  )
  const { width, height, left, top } = stageViewport.bound
  let scale = stageViewport.zoom,
    x = stageViewport.offset.x,
    y = stageViewport.offset.y
  if (target === 'new' && root) {
    scale = Math.min(
      width / ((root.width || 1440) * 1.15),
      height / ((root.height || 900) * 1.15),
    )
    x = (width - (root.width || 1440) * scale) / 2 - (root.x || 0) * scale
    y = (height - (root.height || 900) * scale) / 2 - (root.y || 0) * scale
  }
  return (
    <svg
      style={{ position: 'fixed', left, top, width, height, pointerEvents: 'none' }}>
      {target === 'new' && <rect width='100%' height='100%' fill='#f2f2f2' />}
      <g transform={`translate(${x} ${y}) scale(${scale})`}>
        {created.map((node, index) => (
          <PreviewShape
            key={node.id}
            node={node}
            position={position(node)}
            index={index}
          />
        ))}
      </g>
    </svg>
  )
})

const PreviewShape: FC<{
  node: PreviewNode
  position: { x: number; y: number }
  index: number
}> = ({ node, position, index }) => {
  const width = node.width || 100,
    height = node.height || 100
  const fill: AiFill | undefined = node.fill
  const fillValue =
    fill?.type === 'solid'
      ? fill.color
      : fill?.type === 'linear'
        ? `url(#ai-preview-gradient-${index})`
        : node.type === 'text'
          ? '#000000'
          : '#ffffff'
  const common = {
    opacity: node.opacity ?? 1,
    fill: fillValue,
    stroke: node.stroke?.color || 'none',
    strokeWidth: node.stroke?.width || 0,
    style: node.shadow
      ? {
          filter: `drop-shadow(${node.shadow.offsetX}px ${node.shadow.offsetY}px ${node.shadow.blur}px ${node.shadow.color})`,
        }
      : undefined,
  }
  const angle = fill?.type === 'linear' ? (fill.angle * Math.PI) / 180 : 0
  return (
    <g transform={`translate(${position.x} ${position.y})`}>
      {fill?.type === 'linear' && (
        <defs>
          <linearGradient
            id={`ai-preview-gradient-${index}`}
            x1={`${50 - 50 * Math.cos(angle)}%`}
            y1={`${50 - 50 * Math.sin(angle)}%`}
            x2={`${50 + 50 * Math.cos(angle)}%`}
            y2={`${50 + 50 * Math.sin(angle)}%`}>
            <stop offset='0%' stopColor={fill.from} />
            <stop offset='100%' stopColor={fill.to} />
          </linearGradient>
        </defs>
      )}
      {node.type === 'ellipse' ? (
        <ellipse
          cx={width / 2}
          cy={height / 2}
          rx={width / 2}
          ry={height / 2}
          {...common}
        />
      ) : node.type === 'text' ? (
        <text
          x={
            node.text?.align === 'center'
              ? width / 2
              : node.text?.align === 'right'
                ? width
                : 0
          }
          y={node.text?.fontSize || 16}
          textAnchor={
            node.text?.align === 'center'
              ? 'middle'
              : node.text?.align === 'right'
                ? 'end'
                : 'start'
          }
          fontSize={node.text?.fontSize || 16}
          fontWeight={node.text?.fontWeight || 400}
          {...common}>
          {node.text?.content}
        </text>
      ) : (
        <rect width={width} height={height} rx={node.radius || 0} {...common} />
      )}
    </g>
  )
}
