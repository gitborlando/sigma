export function T<T extends any>(target: any): T {
  return target as T
}

export function prodLog(...args: any[]) {
  if (import.meta.env.PROD) console.log(...args)
}

export const isDEV = import.meta.env.DEV
export const isPROD = import.meta.env.PROD

/**
 * In production environment, we want to disable all console.log to avoid performance issue and potential information leak.
 */
const originalLog = console.log.bind(console)

export function setupConsoleLog() {
  console.log = (...args: any[]) => {
    if (import.meta.env.DEV) originalLog(...args)
  }
}

export function devLog(...args: any[]) {
  originalLog(...args)
}
