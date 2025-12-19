import { CSSProperties } from 'react'

export function classes(linaria: any) {
  return (classes?: string) => {
    return classes ? `${linaria}-${classes}` : linaria
  }
}

export function withCssVars(
  style: CSSProperties | undefined,
  props: Record<string, any>,
) {
  return { ...style, ...props } as CSSProperties
}
