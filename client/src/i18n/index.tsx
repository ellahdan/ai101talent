import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { germanMessages } from './messages'

// Minimal, typed i18n. Each area of the app defines its English and German text side by side with
// `defineText`; TypeScript checks that the German text has exactly the same shape as the English.
// Components read their area with `useT(area)`, so text ships in the same lazy chunk as the page.

export type Lang = 'en' | 'de'
export const LANGS: Lang[] = ['en', 'de']
const STORAGE_KEY = 'ai101-lang'

export interface Text<T> {
  en: T
  de: T
}

export function defineText<T>(en: T, de: NoInfer<T>): Text<T> {
  return { en, de }
}

function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'de') return saved
  } catch { /* storage unavailable */ }
  return navigator.language?.toLowerCase().startsWith('de') ? 'de' : 'en'
}

// Module-level copy of the language for code outside React (formatting helpers, API errors).
let current: Lang = detectLang()
document.documentElement.lang = current

export const getLang = () => current
/** BCP 47 locale for Intl formatters. */
export const getLocale = () => (current === 'de' ? 'de-DE' : 'en-GB')

const LangContext = createContext<{ lang: Lang; setLang: (lang: Lang) => void } | null>(null)

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(current)
  const setLang = useCallback((next: Lang) => {
    current = next
    document.documentElement.lang = next
    try { localStorage.setItem(STORAGE_KEY, next) } catch { /* storage unavailable */ }
    setLangState(next)
  }, [])
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used inside LangProvider')
  return ctx
}

/** The current language's text for one area. Re-renders when the language changes. */
export function useT<T>(text: Text<T>): T {
  return text[useLang().lang]
}

/** Non-hook access, for helpers called during render. */
export function tx<T>(text: Text<T>): T {
  return text[current]
}

/**
 * Translates a message that arrives in English (API errors, validation messages).
 * Unknown messages are shown as they are.
 */
export function translateMessage(message: string) {
  return current === 'de' ? (germanMessages[message] ?? message) : message
}
