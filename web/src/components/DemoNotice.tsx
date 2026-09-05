import { useLayoutEffect, useRef } from 'react'
import { PORTFOLIO_URL } from '../data/site'
import { useLang } from '../i18n/useLang'

/**
 * The one thing on this site that is not a fiction.
 *
 * Nadim Studio is an invented artist with an invented catalogue: media,
 * dimensions and years that read exactly like a real, commissioned, commercially
 * active gallery. That is the demo's content and the craft in it is real — but a
 * visitor has to be told, on every route, before they scroll, or the whole thing
 * is a lie told well.
 *
 * It lives in the App shell rather than on a page so it survives navigation, and
 * it is deliberately not dismissible: a notice a visitor can close is a notice
 * the next visitor never sees.
 *
 * Layout contract: the bar is `fixed`, so it takes no space in the flow, and
 * the routes that fill the viewport (the museum's fixed chrome, the sculpture's
 * h-dvh stage, the two scrolling pages' top padding) all offset themselves by
 * `--demo-bar`. This component owns that variable and keeps it equal to its own
 * measured height, at every viewport width and after any text reflow.
 */
export function DemoNotice() {
  const { t } = useLang()
  const barRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const el = barRef.current
    if (!el) return
    const root = document.documentElement
    const apply = () => {
      root.style.setProperty('--demo-bar', `${String(Math.ceil(el.getBoundingClientRect().height))}px`)
    }
    apply()
    // Width changes, font swap-in and text reflow all change the height, and
    // none of them fire a resize event on their own.
    const observer = new ResizeObserver(apply)
    observer.observe(el)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--demo-bar')
    }
  }, [])

  return (
    <aside
      ref={barRef}
      aria-label={t.demoLabel}
      // z-100 puts it above every overlay on the site — the gallery's intro
      // dialog (z-60), the storage notice (z-90) and the museum's focus panels
      // — so there is no state in which the site is on screen and this is not.
      className="fixed inset-x-0 top-0 z-100 border-b border-line bg-canvas"
    >
      <p className="m-0 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 px-4 py-2 text-center text-[12px] leading-snug font-light text-muted sm:text-[13px]">
        <span className="border border-brand-gold px-1.5 py-px text-[10px] tracking-[0.25em] text-brand-gold">
          {t.demoTag}
        </span>
        <span>
          {t.demoLead}{' '}
          <a
            href={PORTFOLIO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-gold underline underline-offset-2 hover:text-brand-gold-bright"
          >
            {t.demoAuthor}
            <span className="sr-only"> {t.demoNewTab}</span>
          </a>
          . {t.demoBody}
        </span>
      </p>
      {/* The same skewed gold rule the museum draws under its wordmark, so the
          bar reads as part of the site rather than a browser chrome strip. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 -bottom-px block h-px bg-[linear-gradient(90deg,transparent,#d9a441_25%,#ffe9b0_50%,#d9a441_75%,transparent)]"
      />
    </aside>
  )
}
