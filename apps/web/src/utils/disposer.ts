import { flushFuncs, NoopFunc } from '@gitborlando/utils'

export class Disposer {
  private disposers: NoopFunc[] = []

  add = (...disposers: NoopFunc[]) => {
    this.disposers.push(...disposers)
  }

  dispose = () => {
    flushFuncs(this.disposers)
  }

  static collect(...disposers: NoopFunc[]) {
    return () => flushFuncs(disposers)
  }
}
