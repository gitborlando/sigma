import Color from 'color'

export type IRGB = { r: number; g: number; b: number }
export type IRGBA = { r: number; g: number; b: number; a: number }

export const COLOR = {
  random: () => hslRgb(Math.random() * 360, 100, 50),
  white: hslRgb(0, 0, 100),
  black: hslRgb(0, 0, 0),
  gray: rgb(217, 217, 217),
  blue: hslRgb(220, 100, 50),
  pinkRed: hslRgb(280, 100, 50),
}

export function rgb(r: number | string, g: number | string, b: number | string) {
  return `rgb(${r},${g},${b})`
}

export function rgba(r: number, g: number, b: number, a: number = 1) {
  return `rgba(${r},${g},${b},${a})`
}

export function rgbaFromObject(object: IRGBA) {
  return rgba(object.r, object.g, object.b, object.a)
}

export function rgbToRgba(rgbString: string, alpha: number) {
  return rgbString.replace(/rgb/, 'rgba').replace(/\)/, `,${alpha})`)
}

export function hslRgb(h: number, s: number, l: number) {
  return Color.hsl(h, s, l).rgb().string()
}

export function makeLinearGradientCss({ start, end, stops }: S.FillLinearGradient) {
  const degree = Angle.sweep(XY.vector(end, start)) + 90
  return `linear-gradient(${degree}deg, ${stops[0].color} 0%, ${stops
    .map(({ color, offset }) => `${color} ${offset * 100}%`)
    .join(', ')}, ${stops[stops.length - 1].color} 100%)`
}
