export function twoDecimal(number: number) {
  return Number(number.toFixed(Number.isInteger(number) ? 0 : 2))
}

export const memorized = <F extends (deps: any[]) => any>(func: F) => {
  let value: ReturnType<F>
  let lastDeps: any[] | undefined

  const compare = (a: any[], b: any[]) => {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false
    }
    return true
  }

  return (deps: any[]) => {
    if (!lastDeps || !compare(lastDeps, deps)) {
      lastDeps = deps
      value = func(deps)
    }
    return value
  }
}
