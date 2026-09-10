type SlideSessionOptions<Origin> = {
  setup: () => Origin
  apply: (snapshot: Origin, totalDelta: number) => void
}

export const createSlideSession = <Origin extends NonNullable<unknown>>({
  setup,
  apply,
}: SlideSessionOptions<Origin>) => {
  let origin: Origin | undefined = setup()
  let totalDelta = 0

  return (delta: number) => {
    if (origin === undefined) return
    apply(origin, (totalDelta += delta))
  }
}
