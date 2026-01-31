type BaseNode = Record<string, any>

export interface TraverseBaseContext<TNode> {
  parent: TNode | undefined
  depth: number
  index: number
  forwardCtx: TraverseBaseContext<TNode> | undefined
}

export interface TraverseOptions<TNode, TCtx> {
  childrenKey?: string
  enter?: (node: TNode, ctx: TCtx) => void | boolean
  leave?: (node: TNode, ctx: TCtx) => void | boolean
}

type Middleware<TNode, TCtx> = (
  next: TraverseOptions<TNode, TCtx>,
) => TraverseOptions<TNode, any>

type MiddlewarePlugin<TNode, TCtx, TExtension> = (
  next: TraverseOptions<TNode, TCtx & TExtension>,
) => TraverseOptions<TNode, TCtx>

export class Traverser<TNode extends BaseNode, TCtx = TraverseBaseContext<TNode>> {
  private middlewares: Middleware<TNode, any>[] = []
  private options: TraverseOptions<TNode, any>

  constructor(
    options: TraverseOptions<TNode, TCtx>,
    existingMiddlewares: Middleware<TNode, any>[] = [],
  ) {
    this.options = options
    this.middlewares = existingMiddlewares
  }

  use<Extension>(
    plugin: MiddlewarePlugin<TNode, TCtx, Extension>,
  ): Traverser<TNode, TCtx & Extension> {
    return new Traverser<TNode, TCtx & Extension>(this.options, [
      ...this.middlewares,
      plugin,
    ])
  }

  useAncestors() {
    type Extension = { ancestors: TNode[] }

    const plugin: MiddlewarePlugin<TNode, TCtx, Extension> = (next) => {
      const stack: TNode[] = []

      return {
        ...next,
        enter: (node: TNode, ctx: TCtx) => {
          const extendedCtx = ctx as TCtx & Extension
          Object.assign(extendedCtx, { ancestors: [...stack] })

          stack.push(node)

          if (next.enter) next.enter(node, extendedCtx)
        },
        leave: (node: TNode, ctx: TCtx) => {
          const extendedCtx = ctx as TCtx & Extension
          if (next.leave) next.leave(node, extendedCtx)
          stack.pop()
        },
      }
    }

    return this.use<Extension>(plugin)
  }

  useForwardRef() {
    type Extension = { provide: (key: string, value: any) => void }

    const plugin: MiddlewarePlugin<TNode, TCtx, Extension> = (next) => {
      return {
        ...next,
        leave: next.leave
          ? (node: TNode, ctx: TCtx) => {
              next.leave?.(node, ctx as TCtx & Extension)
            }
          : undefined,
        enter: (node: TNode, ctx: TCtx) => {
          const extendedCtx = ctx as TCtx & Extension
          Object.assign(extendedCtx, {
            provide: (key: string, value: any) => {
              ;(extendedCtx as any)[key] = value
            },
          })

          if (next.enter) next.enter(node, extendedCtx)
        },
      }
    }

    return this.use<Extension>(plugin)
  }

  walk(tree: TNode | TNode[], initialContext: Partial<TCtx> = {}) {
    const nodes = Array.isArray(tree) ? tree : [tree]

    let finalOptions: TraverseOptions<TNode, any> = this.options
    for (let i = this.middlewares.length - 1; i >= 0; i--) {
      finalOptions = this.middlewares[i](finalOptions)
    }
    const { childrenKey = 'children' } = finalOptions
    const enter = finalOptions.enter
    const leave = finalOptions.leave

    const walk = (node: TNode, forwardCtx: any, depth: number, index: number) => {
      if (!node) return

      const ctx = Object.create(forwardCtx || null)
      ctx.forwardCtx = forwardCtx
      ctx.index = index
      ctx.depth = depth
      ctx.stop = false
      ctx.stopPropagation = () => {
        ctx.stop = true
      }
      const typedCtx = ctx as TCtx

      let isContinue: boolean | void = true
      if (enter) {
        isContinue = enter(node, typedCtx)
      }

      if (isContinue !== false) {
        const children = node[childrenKey]
        if (Array.isArray(children)) {
          for (let i = 0; i < children.length; i++) {
            walk(children[i], ctx, depth + 1, i)
          }
        }
      }

      if (leave) {
        leave(node, typedCtx)
      }
    }

    const rootBaseCtx = { ...initialContext }
    nodes.forEach((node, index) => walk(node, rootBaseCtx, 0, index))
  }
}

export function createTraverser<T extends BaseNode, TCtx = TraverseBaseContext<T>>(
  options: TraverseOptions<T, TCtx>,
) {
  return new Traverser<T, TCtx>(options)
}
