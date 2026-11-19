import { Service } from '@gitborlando/di-service'
import { miniId } from '@gitborlando/utils'
import { Undo } from '../action/undo'
import { DocCreator } from '../doc/creator'
import { DocMutator } from '../doc/mutator'
import { MRect } from '../geometry'
import { Select } from '../select'
import { YDoc } from '../y-adapter/y-doc'
import { normalizeAiEdit } from './normalize-edit'
import { readAiPageMarker } from './read-page'
import type { AiFill, AiTarget } from './schema'

type Changes = Extract<
  import('./schema').AiEditResult['operations'][number],
  { op: 'update' }
>['changes']

@reflection
export class AiEdit extends Service {
  constructor(
    private readonly yDoc: YDoc,
    private readonly creator: DocCreator,
    private readonly mutator: DocMutator,
    private readonly select: Select,
    private readonly undo: Undo,
  ) {
    super()
  }

  apply(input: unknown, target: AiTarget, pageId: string, marker?: string) {
    const result = normalizeAiEdit(input, pageId, target)
    const doc = this.yDoc.doc
    if (target === 'current') {
      let currentMarker: string | undefined
      try {
        currentMarker = readAiPageMarker(doc, pageId)
      } catch {
        throw new Error(t('The page has changed; please send again'))
      }
      if (this.select.selectPageId !== pageId || currentMarker !== marker)
        throw new Error(t('The page has changed; please send again'))
    }
    const page =
      target === 'new' ? this.creator.page() : (doc.graphs[pageId] as S.Page)
    if (!page || page.type !== 'page') throw new Error(t('No current page'))
    const virtual = new Map<
      string,
      { type: string; parentId: string; depth: number; children: string[] }
    >()
    virtual.set(page.id, {
      type: 'page',
      parentId: '',
      depth: 0,
      children: [...page.childIds],
    })
    if (target === 'current') {
      const collect = (id: string, parentId: string, depth: number) => {
        const node = doc.graphs[id]
        if (
          !node ||
          node.type !== 'node' ||
          node.parentId !== parentId ||
          virtual.has(id)
        )
          throw new Error(t('Invalid page structure'))
        const children = 'childIds' in node ? [...node.childIds] : []
        virtual.set(id, {
          type: node.variant,
          parentId: node.parentId,
          depth,
          children,
        })
        children.forEach((child) => collect(child, id, depth + 1))
      }
      page.childIds.forEach((id) => collect(id, page.id, 1))
    }
    const ids = new Map<string, string>()
    const deleted: string[] = []
    const updates: { id: string; changes: Changes }[] = []
    const creations: { node: S.Node; parentId: string }[] = []
    const supported = (type: string) =>
      ['frame', 'rect', 'ellipse', 'text'].includes(type)
    const checkFields = (type: string, changes: Changes) => {
      if (changes.text && type !== 'text')
        throw new Error(t('Only text nodes support text properties'))
      if (changes.radius !== undefined && type === 'text')
        throw new Error(t('This node does not support corner radius'))
    }
    const remove = (id: string) => {
      const entry = virtual.get(id)!
      entry.children.forEach(remove)
      virtual.delete(id)
      deleted.push(id)
    }
    const canRemove = (id: string): boolean => {
      const entry = virtual.get(id)!
      return supported(entry.type) && entry.children.every(canRemove)
    }
    for (const op of result.operations) {
      if (op.op === 'create') {
        if (ids.has(op.id)) throw new Error(t('Duplicate node ID'))
        let parentId =
          op.parentId === '@page' && target === 'new'
            ? page.id
            : ids.get(op.parentId) || op.parentId
        let parent = virtual.get(parentId)
        if (!parent || (parent.type !== 'page' && parent.type !== 'frame')) {
          parentId = page.id
          parent = virtual.get(parentId)!
        }
        if (parent.depth >= 8) {
          parentId = page.id
          parent = virtual.get(parentId)!
        }
        checkFields(op.node.type, op.node)
        const id = miniId(8)
        if (doc.graphs[id] || virtual.has(id))
          throw new Error(t('Node ID collision'))
        ids.set(op.id, id)
        const node = this.creator[op.node.type]() as S.Node
        node.id = id
        node.name = op.node.name ?? this.creator.createNodeName(op.node.type)
        this.modifyNode(node, op.node)
        virtual.set(id, {
          type: node.variant,
          parentId,
          depth: parent.depth + 1,
          children: [],
        })
        parent.children.push(id)
        creations.push({ node, parentId })
      } else {
        const id = ids.get(op.id) || op.id
        const entry = virtual.get(id)
        if (!entry || !supported(entry.type)) continue
        if (op.op === 'delete') {
          if (!canRemove(id)) continue
          virtual.get(entry.parentId)!.children = virtual
            .get(entry.parentId)!
            .children.filter((child) => child !== id)
          remove(id)
        } else {
          const changes = { ...op.changes }
          if (entry.type !== 'text') delete changes.text
          if (entry.type === 'text') delete changes.radius
          updates.push({ id, changes })
        }
      }
    }
    // Precompute all changed nodes before entering the transaction.
    const changed = new Map<string, S.Node>()
    const createdById = new Map(creations.map(({ node }) => [node.id, node]))
    for (const { id, changes } of updates) {
      if (!virtual.has(id)) continue
      const source =
        changed.get(id) || createdById.get(id) || (doc.graphs[id] as S.Node)
      const node = structuredClone(source)
      this.modifyNode(node, changes)
      changed.set(id, node)
    }
    const existingDeleted = deleted.filter((id) => !!doc.graphs[id])
    const deletedIds = new Set(existingDeleted)
    const existingChanged = [...changed].filter(
      ([id, node]) =>
        !!doc.graphs[id] && JSON.stringify(doc.graphs[id]) !== JSON.stringify(node),
    )
    const survivingCreates = creations.filter(({ node }) => virtual.has(node.id))
    if (
      target === 'current' &&
      !existingDeleted.length &&
      !existingChanged.length &&
      !survivingCreates.length
    )
      return result.summary || t('AI edit')
    const parents = new Map<string, S.Parent>()
    const parentFor = (id: string) => {
      const existing = parents.get(id)
      if (existing) return existing
      const source = id === page.id ? page : (doc.graphs[id] as S.Parent)
      if (!source || !('childIds' in source)) return undefined
      const parent = { ...source, childIds: [...source.childIds] }
      parents.set(id, parent)
      return parent
    }
    this.yDoc.transact(() => {
      if (target === 'new') {
        this.yDoc.set<S.Page>(['graphs', page.id], page)
        this.yDoc.insert<S.Meta>(['meta', 'pageIds'], page.id)
      }
      for (const id of existingDeleted) {
        const node = doc.graphs[id] as S.Node
        const parent = parentFor(node.parentId)
        if (parent && !deletedIds.has(parent.id)) {
          this.mutator.deleteChild(parent, node)
          parent.childIds.splice(parent.childIds.indexOf(id), 1)
        } else this.yDoc.delete<S.Node>(['graphs', id])
      }
      for (const [id, node] of existingChanged) {
        const original = doc.graphs[id] as S.Node
        this.mutator.setNodeSize(original, node.width, node.height)
        for (const key of [
          'matrix',
          'name',
          'opacity',
          'fills',
          'stroke',
          'shadows',
          'radius',
          'content',
          'style',
        ] as const) {
          if (
            key in node &&
            JSON.stringify(Reflect.get(original, key)) !==
              JSON.stringify(Reflect.get(node, key))
          )
            this.yDoc.set(['graphs', id, key], Reflect.get(node, key))
        }
      }
      for (const { node, parentId } of survivingCreates) {
        const final = changed.get(node.id) || node
        this.mutator.addNodes([final])
        const parent = parentFor(parentId)!
        this.mutator.insertChildAt(parent, final)
        parent.childIds.push(final.id)
        if ('childIds' in final) parents.set(final.id, { ...final, childIds: [] })
      }
    })
    if (target === 'new') this.select.selectPage(page.id)
    this.undo.track('all', result.summary || t('AI edit'))
    return result.summary || t('AI edit')
  }

  private modifyNode(node: S.Node, changes: Changes) {
    const rect = MRect.of(node)
    if (changes.x !== undefined) rect.x = changes.x
    if (changes.y !== undefined) rect.y = changes.y
    node.matrix = rect.matrix
    if (changes.width !== undefined) node.width = changes.width
    if (changes.height !== undefined) node.height = changes.height
    if (changes.name !== undefined) node.name = changes.name
    if (changes.opacity !== undefined) node.opacity = changes.opacity
    if (changes.fill) node.fills = [this.fill(changes.fill, node.width, node.height)]
    if (changes.stroke !== undefined)
      node.stroke = changes.stroke
        ? this.creator.solidStroke(changes.stroke.color, changes.stroke.width)
        : this.creator.stroke({ visible: false })
    if (changes.shadow !== undefined)
      node.shadows = changes.shadow
        ? [
            this.creator.shadow({
              offsetX: changes.shadow.offsetX,
              offsetY: changes.shadow.offsetY,
              blur: changes.shadow.blur,
              spread: changes.shadow.spread,
              fill: this.creator.fillColor(changes.shadow.color),
            }),
          ]
        : []
    if (
      changes.radius !== undefined &&
      (node.variant === 'frame' || node.variant === 'rect')
    )
      node.radius = changes.radius
    if (changes.text && node.variant === 'text') {
      const { content, ...style } = changes.text
      if (content !== undefined) node.content = content
      Object.assign(node.style, style)
    }
  }

  private fill(fill: AiFill, width: number, height: number) {
    if (fill.type === 'solid') return this.creator.fillColor(fill.color)
    const angle = ((fill.angle % 360) * Math.PI) / 180
    const x = Math.cos(angle) / (width || 1),
      y = Math.sin(angle) / (height || 1),
      scale = 0.5 / Math.max(Math.abs(x), Math.abs(y))
    const linear = this.creator.fillLinear(
      { x: 0.5 - x * scale, y: 0.5 - y * scale },
      { x: 0.5 + x * scale, y: 0.5 + y * scale },
    )
    linear.stops = [
      { offset: 0, color: fill.from },
      { offset: 1, color: fill.to },
    ]
    return linear
  }
}
