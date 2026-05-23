import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { camelCase, pascalCase } from 'nano-string-utils'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import zh from './locales/zh.json'

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources: {
      zh: {
        translation: zh,
      },
      en: {
        translation: en,
      },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    debug: false,
  })

const mobx = observable({ language: i18n.language })

export function getLanguage() {
  return mobx.language
}

export function setLanguage(language: string) {
  i18n.changeLanguage(language)
  mobx.language = language
}

export function t(...args: Parameters<typeof i18n.t>) {
  getLanguage()
  return i18n.t(...args)
}

type TOptions = { space?: boolean; pascalCase?: boolean; camelCase?: boolean }

export function sentence(...args: string[]): string
export function sentence(...args: [...string[], TOptions]): string
export function sentence(...args: string[] | [...string[], TOptions]) {
  const language = getLanguage()

  let words: string[] = []
  let options: TOptions = {}

  if (typeof args[args.length - 1] === 'object') {
    words = args.slice(0, -1) as string[]
    options = args[args.length - 1] as TOptions
  } else {
    words = args as string[]
  }

  const output = words.map((word) => {
    if (options.pascalCase) {
      return pascalCase(word)
    }
    return word
  })

  if (language === 'en' && !options.space) {
    options.space = true
  }
  if (options.space && language !== 'zh') {
    return output.join(' ')
  }
  if (options.camelCase) {
    return camelCase(output.join(' '))
  }
  return output.join('')
}

export default i18n
