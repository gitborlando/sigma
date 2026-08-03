export const arrayLoopGet = <T>(arr: T[], index: number) => {
  const loopIndex = index < 0 ? arr.length - 1 : index >= arr.length ? 0 : index
  return arr[loopIndex]
}
