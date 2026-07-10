export type DisposerFunc = () => void

export class Disposer {
  private disposers = new Set<DisposerFunc>()

  register(...disposers: DisposerFunc[]) {
    disposers.forEach((d) => this.disposers.add(d))
  }

  dispose = () => {
    Disposer.flushDisposers(this.disposers)
  }

  static combine(...disposers: DisposerFunc[]) {
    return () => Disposer.flushDisposers(new Set(disposers))
  }

  private static flushDisposers(disposers: Set<DisposerFunc>) {
    disposers.forEach((dispose) => dispose())
    disposers.clear()
  }
}
