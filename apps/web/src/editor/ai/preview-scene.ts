import { normalizeAiEdit } from './normalize-edit'
import type { AiFill, AiPageSnapshot, AiSnapshotNode, AiTarget } from './schema'

export type AiPreviewNode = {
  id: string
  type: 'frame' | 'rect' | 'ellipse' | 'text'
  worldX: number
  worldY: number
  width?: number
  height?: number
  opacity?: number
  fill?: AiFill
  stroke?: { color: string; width: number } | null
  shadow?: AiSnapshotNode['shadow'] | null
  radius?: number
  text?: AiSnapshotNode['text']
}

export type AiPreviewScene = {
  target: AiTarget
  pageId: string
  nodes: AiPreviewNode[]
  root?: { x: number; y: number; width: number; height: number }
}

type Draft = AiSnapshotNode & {
  stroke?: AiSnapshotNode['stroke'] | null
  shadow?: AiSnapshotNode['shadow'] | null
}

// Project a partial model response into the overlay the canvas paints.
// Parents that are not themselves highlighted still contribute their position.
export const projectAiPreview = (
  target: AiTarget,
  snapshot: AiPageSnapshot | undefined,
  operations: unknown[],
): AiPreviewScene => {
  const pageId = snapshot?.pageId || '@page'
  const result = normalizeAiEdit({ operations }, pageId, target)
  const nodes = new Map<string, Draft>()
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
  const world = (node: Draft) => {
    let x = node.x || 0
    let y = node.y || 0
    let parent = nodes.get(node.parentId)
    let depth = 0
    while (parent && depth++ < 8) {
      x += parent.x || 0
      y += parent.y || 0
      parent = nodes.get(parent.parentId)
    }
    return { x, y }
  }
  const shown = [...visible]
    .map((id) => nodes.get(id))
    .filter(
      (node): node is Draft & { type: AiPreviewNode['type'] } =>
        !!node && node.type !== 'unsupported',
    )
  const root = shown.find(
    (node) => node.parentId === '@page' || node.parentId === pageId,
  )
  return {
    target,
    pageId,
    nodes: shown.map((node) => {
      const position = world(node)
      return {
        id: node.id,
        type: node.type,
        worldX: position.x,
        worldY: position.y,
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        fill: node.fill,
        stroke: node.stroke,
        shadow: node.shadow,
        radius: node.radius,
        text: node.text,
      }
    }),
    root: root
      ? {
          x: root.x || 0,
          y: root.y || 0,
          width: root.width || 1440,
          height: root.height || 900,
        }
      : undefined,
  }
}
