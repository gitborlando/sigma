import { Disposer, DisposerFunc } from '@gitborlando/toolkit'
import { ClassConstructor, DI } from 'first-di'
export * from 'first-di'

export type ServiceMap = Record<string, abstract new (...params: any[]) => object>

export type ServiceInstances<Map extends ServiceMap> = {
  [K in keyof Map]: Map[K] extends abstract new (...params: any[]) => infer S
    ? S
    : never
}

export class ScopedDI extends DI {
  constructor(protected parent?: ScopedDI) {
    super()
  }

  protected override makeResolve<T extends object>(
    constructor: ClassConstructor<T>,
    options?: Parameters<DI['autowired']>[0],
    caller?: object,
    propertyKey?: string | symbol,
  ) {
    if (this.parent) {
      return this.parent.resolve(constructor, options, caller, propertyKey)
    }
    return super.makeResolve(constructor, options, caller, propertyKey)
  }

  dispose() {
    ;[...this.singletonsList.values()]
      .filter((s) => s instanceof Service)
      .forEach((s) => s.dispose())
    this.reset()
  }
}

export abstract class Service {
  protected disposer = new Disposer()

  protected effect(...disposers: DisposerFunc[]) {
    return this.disposer.register(...disposers)
  }

  dispose() {
    this.disposer.dispose()
  }
}

export class ServiceContainer<Map extends ServiceMap = {}> extends Service {
  container: ScopedDI

  constructor(
    private readonly services: Map,
    private readonly parent?: ServiceContainer,
  ) {
    super()
    this.container = new ScopedDI(this.parent?.container)
    this.effect(() => this.container.dispose())
  }

  resolve = <K extends keyof Map>(key: K): ServiceInstances<Map>[K] =>
    this.container.singleton(
      this.services[key] as unknown as ClassConstructor<object>,
    ) as ServiceInstances<Map>[K]
}
