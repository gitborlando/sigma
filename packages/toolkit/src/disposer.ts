export type DisposerFunc = () => void

export class Disposer {
  private disposers: DisposerFunc[] = []

  add = (...disposers: DisposerFunc[]) => {
    this.disposers.push(...disposers)
  }

  dispose = () => {
    flushDisposers(this.disposers)
  }

  static combine(...disposers: DisposerFunc[]) {
    return () => flushDisposers(disposers)
  }
}

export const flushDisposers = (disposers: DisposerFunc[]) => {
  disposers.forEach((dispose) => dispose())
  disposers.length = 0
}
