import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
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

export default i18n
