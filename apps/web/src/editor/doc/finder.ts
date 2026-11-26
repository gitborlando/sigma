import { Service } from '@gitborlando/di-service'
import { DocGuards } from './guards'
import { YDoc } from '../y-adapter/y-doc'
import { debugId } from 'src/shared/dev'

@reflection
export class DocFinder extends Service {
  constructor(private readonly yDoc: YDoc) {
    super()
  }

  findNode(id: ID): S.Node
  findNode<V extends S.Node['variant']>(
    id: ID,
    variant: V,
  ): Extract<S.Node, { variant: V }>
  findNode(id: ID, variant?: S.Node['variant']): S.Node {
    if (!id) throw new Error(`findNode invalid id: ${id}`)

    const node = this.yDoc.doc.graphs[id]
    if (!DocGuards.isNode(node)) throw new Error(`Node not found: ${id}`)
    if (!variant) return node
    if ('variant' in node && node.variant === variant) return node

    throw new Error(`Node ${id} is not of variant ${variant}`)
  }

  findPage(id: ID) {
    if (!id) throw new Error(`findPage invalid id: ${id}`)

    const page = this.yDoc.doc.graphs[id]
    if (DocGuards.isPage(page)) return page

    throw new Error(`Page not found: ${id}`)
  }

  findGraph(id: ID) {
    if (!id) throw new Error(`findGraph invalid id: ${id}`)

    const doc = this.yDoc.doc
    if (doc.graphs[id]) return doc.graphs[id] as S.Graph

    throw new Error(`Item not found: ${id}`)
  }

  findParent(id: ID) {
    if (!id) throw new Error(`findParent invalid id: ${id}`)

    const parent = this.findGraph(id)
    debugId === '11' && console.log('parent: ', parent)
    if (DocGuards.isParent(parent)) return parent

    throw new Error(`Parent not found: ${id}`)
  }
}
