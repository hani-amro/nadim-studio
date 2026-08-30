import { useLang } from '../i18n/useLang'

/** The button's own label is in the *other* language, so it carries its own
 *  `lang` attribute — otherwise a screen reader reads "EN" with Arabic
 *  pronunciation rules (and vice versa). */
export function LangToggle({ className = '' }: { className?: string }) {
  const { t, toggle } = useLang()
  return (
    <button
      type="button"
      onClick={toggle}
      lang={t.langBtnLang}
      className={`min-h-11 cursor-pointer border border-line px-4 py-2 text-xs font-medium tracking-widest text-brand-gold hover:border-brand-gold ${className}`}
    >
      {t.langBtn}
    </button>
  )
}
