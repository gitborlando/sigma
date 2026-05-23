export function T<T extends any>(target: any): T {
  return target as T
}

export function prodLog(...args: any[]) {
  if (import.meta.env.PROD) console.log(...args)
}

export const isDEV = import.meta.env.DEV
export const isPROD = import.meta.env.PROD
