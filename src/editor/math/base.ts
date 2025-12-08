export const { sqrt, abs, min, max, round, floor, ceil, random } = Math

export function pow2(number: number) {
  return Math.pow(number, 2)
}
export function pow3(number: number) {
  return Math.pow(number, 3)
}

export function multiply(...numbers: number[]) {
  return numbers.reduce((i, all) => (all *= i), 1)
}
export function divide(a: number, b: number) {
  return b === 0 ? 1 : a / b
}
