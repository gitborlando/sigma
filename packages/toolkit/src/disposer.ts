export type DisposerFunc = () => void

export class Disposer {
  private disposers = new Set<DisposerFunc>()

  add = (...disposers: DisposerFunc[]) => {
    disposers.forEach((d) => this.disposers.add(d))
  }

  dispose = () => {
    flushDisposers(this.disposers)
  }

  static combine(...disposers: DisposerFunc[]) {
    return () => flushDisposers(new Set(disposers))
  }
}

const flushDisposers = (disposers: Set<DisposerFunc>) => {
  disposers.forEach((dispose) => dispose())
  disposers.clear()
}
