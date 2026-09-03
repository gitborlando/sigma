import { docGetter } from 'src/editor/doc/getter'
import { DocHelper } from 'src/editor/doc/helper'
import { debugId } from 'src/shared/dev'

export function findNode(id: ID): S.Node
export function findNode<V extends S.Node['variant']>(
  id: ID,
  variant: V,
): Extract<S.Node, { variant: V }>
export function findNode(id: ID, variant?: S.Node['variant']): S.Node {
  if (!id) throw new Error(`findNode invalid id: ${id}`)

  const node = docGetter().graphs[id]
  if (!DocHelper.isNode(node)) throw new Error(`Node not found: ${id}`)
  if (!variant) return node
  if ('variant' in node && node.variant === variant) return node

  throw new Error(`Node ${id} is not of variant ${variant}`)
}

export const findPage = (id: ID) => {
  if (!id) throw new Error(`findPage invalid id: ${id}`)

  const page = docGetter().graphs[id]
  if (DocHelper.isPage(page)) return page

  throw new Error(`Page not found: ${id}`)
}

export const findGraph = (id: ID) => {
  if (!id) throw new Error(`findGraph invalid id: ${id}`)

  const doc = docGetter()
  if (doc.graphs[id]) return doc.graphs[id] as S.Graph

  throw new Error(`Item not found: ${id}`)
}

export const findParent = (id: ID) => {
  if (!id) throw new Error(`findParent invalid id: ${id}`)

  const parent = findGraph(id)
  debugId === '11' && console.log('parent: ', parent)
  if (DocHelper.isParent(parent)) return parent

  throw new Error(`Parent not found: ${id}`)
}
