import type { AnyObject } from '@gitborlando/utils'

export class DocGuards {
  private static isGraph(item: AnyObject): item is S.Graph {
    return typeof item === 'object' && item !== null && 'type' in item
  }

  static isPage(item: AnyObject): item is S.Page {
    return this.isGraph(item) && item.type === 'page'
  }

  static isNode(item: AnyObject): item is S.Node
  static isNode(
    item: AnyObject,
    variant: S.Node['variant'],
  ): item is Extract<S.Node, { variant: typeof variant }>
  static isNode(item: AnyObject, variant?: S.Node['variant']): item is S.Node {
    if (!this.isGraph(item))
      throw new Error(`DocHelper.isNode error: invalid item ${item}`)
    if (!variant) return item.type === 'node'
    return 'variant' in item && item.variant === variant
  }

  static isParent<T extends S.Parent>(item: AnyObject): item is T {
    return this.isGraph(item) && 'childIds' in item
  }
}
