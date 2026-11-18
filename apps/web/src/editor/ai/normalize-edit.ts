import Color from 'color'
import type { AiEditResult } from './schema'

// Temporary compatibility layer for model output: retain recognizable edits and defaults.
export const normalizeAiEdit = (
  value: unknown,
  pageId: string,
  target: 'new' | 'current',
): AiEditResult => {
  const result: Record<string, any> = Array.isArray(value)
    ? { operations: value }
    : value && typeof value === 'object'
      ? (value as Record<string, any>)
      : {}
  const input = Array.isArray(result.operations) ? result.operations : []
  const aliases = new Map<string, string>()
  const creates = input.filter(
    (op: any) =>
      op?.op === 'create' &&
      ['frame', 'rect', 'ellipse', 'text'].includes(op.node?.type),
  )
  creates.forEach((op: any, index: number) =>
    aliases.set(String(op.id ?? index), `$node${index}`),
  )
  const num = (n: unknown, fallback: number) =>
    typeof n === 'number' && Number.isFinite(n) ? n : fallback
  const color = (v: unknown) => {
    try {
      return typeof v === 'string' ? Color(v).hex() : undefined
    } catch {
      return undefined
    }
  }
  const fields = (value: any, creating: boolean) => {
    const src = value && typeof value === 'object' ? value : {}
    const out: Record<string, any> = {}
    if (typeof src.name === 'string') out.name = src.name
    for (const key of ['x', 'y'])
      if (creating || typeof src[key] === 'number') out[key] = num(src[key], 0)
    for (const key of ['width', 'height'])
      if (creating || typeof src[key] === 'number')
        out[key] = Math.max(1, Math.min(10000, num(src[key], 100)))
    if (typeof src.opacity === 'number')
      out.opacity = Math.max(0, Math.min(1, num(src.opacity, 1)))
    if (typeof src.radius === 'number') out.radius = Math.max(0, num(src.radius, 0))
    if (src.fill?.type === 'solid' && color(src.fill.color))
      out.fill = { type: 'solid', color: color(src.fill.color) }
    if (src.fill?.type === 'linear' && color(src.fill.from) && color(src.fill.to))
      out.fill = {
        type: 'linear',
        from: color(src.fill.from),
        to: color(src.fill.to),
        angle: num(src.fill.angle, 0),
      }
    if (src.stroke === null) out.stroke = null
    else if (color(src.stroke?.color))
      out.stroke = {
        color: color(src.stroke.color),
        width: Math.max(0, num(src.stroke.width, 1)),
      }
    if (src.shadow === null) out.shadow = null
    else if (color(src.shadow?.color))
      out.shadow = {
        color: color(src.shadow.color),
        offsetX: num(src.shadow.offsetX, 0),
        offsetY: num(src.shadow.offsetY, 0),
        blur: Math.max(0, num(src.shadow.blur, 0)),
        spread: num(src.shadow.spread, 0),
      }
    if (src.text && typeof src.text === 'object') {
      out.text = {}
      if (typeof src.text.content === 'string')
        out.text.content = src.text.content.slice(0, 500)
      for (const key of ['fontSize', 'fontWeight', 'lineHeight'])
        if (
          typeof src.text[key] === 'number' &&
          Number.isFinite(src.text[key]) &&
          src.text[key] > 0
        )
          out.text[key] = src.text[key]
      if (['left', 'center', 'right'].includes(src.text.align))
        out.text.align = src.text.align
    }
    return out
  }
  const pending = creates.map((op: any, index: number) => ({
    op,
    id: `$node${index}`,
  }))
  const ordered: AiEditResult['operations'] = []
  const ready = new Set<string>()
  const byId = new Map<string, (typeof pending)[number]>(
    pending.map((item: (typeof pending)[number]) => [item.id, item]),
  )
  const append = ({ op, id }: (typeof pending)[number]) => {
    const parent = aliases.get(String(op.parentId))
    const parentId =
      parent && ready.has(parent)
        ? parent
        : target === 'new'
          ? '@page'
          : op.parentId === '@page'
            ? pageId
            : String(op.parentId || pageId)
    const node: Record<string, any> = {
      type: op.node.type,
      ...fields(op.node, true),
    }
    if (node.type !== 'text') delete node.text
    if (node.type === 'text') delete node.radius
    ordered.push({
      op: 'create',
      id,
      parentId,
      node,
    } as AiEditResult['operations'][number])
    ready.add(id)
  }
  for (const item of pending) {
    const chain: typeof pending = []
    const visiting = new Set<string>()
    let current: (typeof pending)[number] | undefined = item
    while (current && !ready.has(current.id) && !visiting.has(current.id)) {
      chain.push(current)
      visiting.add(current.id)
      const parentId = aliases.get(String(current.op.parentId))
      current = parentId ? byId.get(parentId) : undefined
    }
    while (chain.length) {
      const next = chain.pop()!
      if (!ready.has(next.id)) append(next)
    }
  }
  for (const op of input) {
    if (op?.op !== 'update' && op?.op !== 'delete') continue
    const id = aliases.get(String(op.id)) || String(op.id || '')
    if (!id) continue
    ordered.push(
      op.op === 'delete'
        ? { op: 'delete', id }
        : { op: 'update', id, changes: fields(op.changes, false) },
    )
  }
  return {
    summary: typeof result.summary === 'string' ? result.summary.slice(0, 80) : '',
    operations: ordered,
  }
}
