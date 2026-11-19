import type { AiPreviewNode } from '../../../editor/ai/preview-scene'
import type { AiFill } from '../../../editor/ai/schema'

export const PreviewShape: FC<{ node: AiPreviewNode; index: number }> = ({
  node,
  index,
}) => {
  const width = node.width || 100
  const height = node.height || 100
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
    <g transform={`translate(${node.worldX} ${node.worldY})`}>
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
