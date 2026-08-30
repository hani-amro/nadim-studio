import { create } from 'zustand'
import { STRINGS, type Lang, type Strings } from './strings'

const KEY = 'nadim-lang'

function initial(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'ar' || saved === 'en') return saved
  } catch {
    // Storage can throw outright in private mode; the default is fine.
  }
  return 'ar'
}

interface LangState {
  lang: Lang
  setLang: (l: Lang) => void
  toggle: () => void
}

export const useLangStore = create<LangState>((set, get) => ({
  lang: initial(),
  setLang: (lang) => {
    set({ lang })
    try {
      localStorage.setItem(KEY, lang)
    } catch {
      // A lost preference is not worth interrupting the visitor over; the
      // failures that lose their *work* are the ones we surface.
    }
  },
  toggle: () => get().setLang(get().lang === 'ar' ? 'en' : 'ar'),
}))

/**
 * Assistive tech and the browser's own bidi algorithm read the document
 * element, not a wrapper div — so the toggle has to move `lang`/`dir` there.
 */
export function applyDocumentLang(lang: Lang): void {
  const el = document.documentElement
  el.setAttribute('lang', lang)
  el.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr')
}

export function useLang(): { lang: Lang; t: Strings; toggle: () => void; isRtl: boolean } {
  const lang = useLangStore((s) => s.lang)
  const toggle = useLangStore((s) => s.toggle)
  return { lang, t: STRINGS[lang], toggle, isRtl: lang === 'ar' }
}
