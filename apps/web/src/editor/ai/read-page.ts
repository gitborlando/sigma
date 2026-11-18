import Color from 'color'
import { DocHelper } from '../doc/helper'
import type { AiFill, AiPageSnapshot, AiSnapshotNode } from './schema'

const toHex = (value: string) => {
  try {
    return Color(value).hex()
  } catch {
    return undefined
  }
}

const readFill = (
  fills: S.Node['fills'],
  width: number,
  height: number,
): AiFill | undefined => {
  const fill = fills.find((item) => item.visible)
  if (!fill) return
  if (fill.type === 'color') {
    const color = toHex(fill.color)
    if (color) return { type: 'solid', color }
  }
  if (fill.type === 'linear' && fill.stops.length === 2) {
    const from = toHex(fill.stops[0].color)
    const to = toHex(fill.stops[1].color)
    if (!from || !to) return
    return {
      type: 'linear',
      from,
      to,
      angle:
        (Math.atan2(
          (fill.end.y - fill.start.y) * height,
          (fill.end.x - fill.start.x) * width,
        ) *
          180) /
        Math.PI,
    }
  }
}

export const readAiPage = (doc: S.Doc, pageId: string): AiPageSnapshot => {
  const page = doc.graphs[pageId]
  if (!page || page.type !== 'page') throw new Error(t('No current page'))
  const nodes: AiSnapshotNode[] = []
  const visited = new Set<string>()
  const visit = (id: string, parentId: string) => {
    const node = doc.graphs[id]
    if (
      !node ||
      node.type !== 'node' ||
      node.parentId !== parentId ||
      visited.has(id)
    )
      throw new Error(t('Invalid page structure'))
    visited.add(id)
    const supported =
      node.variant === 'frame' ||
      node.variant === 'rect' ||
      node.variant === 'ellipse' ||
      node.variant === 'text'
    const item: AiSnapshotNode = {
      id: node.id,
      type: supported ? (node.variant as AiSnapshotNode['type']) : 'unsupported',
      name: node.name,
      parentId: node.parentId,
    }
    nodes.push(item)
    if (supported) {
      const rect = DocHelper.getMRect(node)
      Object.assign(item, {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        opacity: node.opacity,
        fill: readFill(node.fills, node.width, node.height),
      })
      if (node.stroke.visible) {
        const fill = node.stroke.fills.find(
          (value) => value.visible && value.type === 'color',
        )
        const color = fill?.type === 'color' ? toHex(fill.color) : undefined
        if (color) item.stroke = { color, width: node.stroke.width }
      }
      const shadow = node.shadows.find((value) => value.visible)
      const shadowColor =
        shadow?.fill.type === 'color' ? toHex(shadow.fill.color) : undefined
      if (shadow && shadowColor)
        item.shadow = {
          offsetX: shadow.offsetX,
          offsetY: shadow.offsetY,
          blur: shadow.blur,
          spread: shadow.spread,
          color: shadowColor,
        }
      if (node.variant === 'frame' || node.variant === 'rect')
        item.radius = node.radius
      if (node.variant === 'text')
        item.text = {
          content: node.content,
          fontSize: node.style.fontSize,
          fontWeight:
            typeof node.style.fontWeight === 'number'
              ? node.style.fontWeight
              : node.style.fontWeight === 'normal'
                ? 400
                : 700,
          align: node.style.align,
          lineHeight: node.style.lineHeight,
        }
      if (node.variant === 'frame') item.childIds = [...node.childIds]
    }
    if ('childIds' in node) node.childIds.forEach((child) => visit(child, id))
  }
  page.childIds.forEach((id) => visit(id, pageId))
  return { pageId, pageName: page.name, nodes }
}

// Keep the concurrency marker independent of the reduced, model-facing snapshot.
export const readAiPageMarker = (doc: S.Doc, pageId: string) => {
  const page = doc.graphs[pageId]
  if (!page || page.type !== 'page') throw new Error(t('No current page'))
  const nodes: unknown[] = []
  const visited = new Set<string>()
  const visit = (id: string, parentId: string) => {
    const node = doc.graphs[id]
    if (
      !node ||
      node.type !== 'node' ||
      node.parentId !== parentId ||
      visited.has(id)
    )
      throw new Error(t('Invalid page structure'))
    visited.add(id)
    const children = 'childIds' in node ? node.childIds : undefined
    const base = {
      id: node.id,
      type: node.variant,
      name: node.name,
      parentId: node.parentId,
      children,
    }
    if (
      node.variant === 'frame' ||
      node.variant === 'rect' ||
      node.variant === 'ellipse' ||
      node.variant === 'text'
    ) {
      nodes.push({
        ...base,
        matrix: node.matrix,
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        fills: node.fills,
        stroke: node.stroke,
        shadows: node.shadows,
        radius: 'radius' in node ? node.radius : undefined,
        text:
          node.variant === 'text'
            ? { content: node.content, style: node.style }
            : undefined,
      })
    } else nodes.push(base)
    children?.forEach((child) => visit(child, id))
  }
  page.childIds.forEach((id) => visit(id, pageId))
  return JSON.stringify({ pageId, name: page.name, childIds: page.childIds, nodes })
}
