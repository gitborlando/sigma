import { hslRgb } from 'src/utils/color'

const hue = 280

const root = document.body
root.style.setProperty('--hue', String(hue))
root.style.setProperty('--color', hslRgb(hue, 100, 70))
root.style.setProperty('--color-light', hslRgb(hue, 100, 70))
root.style.setProperty('--color-bg', hslRgb(hue, 100, 93))
root.style.setProperty('--color-bg-half', hslRgb(hue, 100, 98))

export const themeColor = (lightness: number = 50) => {
  return hslRgb(hue, 100, lightness)
}
