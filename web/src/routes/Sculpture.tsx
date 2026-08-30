import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../data/site'
import { useLang } from '../i18n/useLang'
import { createStage, SCULPTURE, type Stage } from './sculpture/scene'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

const LINK_CLASS =
  'inline-flex min-h-11 items-center border border-line-museum px-4 py-2 text-xs text-brand-gold transition-colors hover:border-brand-gold hover:text-brand-gold-bright'

export function Sculpture() {
  const { t } = useLang()
  const hostRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Stage | null>(null)
  const [failed, setFailed] = useState(false)
  const [spin, setSpin] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia(REDUCED_MOTION).matches)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let stage: Stage
    try {
      stage = createStage(host)
    } catch (err) {
      // WebGL can be absent, blocked, or out of contexts. The visitor gets the
      // piece described in words rather than a black rectangle, and the real
      // cause still reaches the console instead of being swallowed.
      console.error(err)
      // react-hooks/set-state-in-effect is disabled for this one line, not to
      // hide a cascading render but because this IS the documented case: an
      // external system (WebGL) failed during setup and the UI has to say so.
      // Deriving it during render is impossible — the failure only exists once
      // the effect has tried. The alternative is the blank rectangle the audit
      // flagged on the old page.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFailed(true)
      return
    }
    stageRef.current = stage

    return () => {
      stage.dispose()
      stageRef.current = null
    }
  }, [])

  useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  // The turntable is opt-in and prefers-reduced-motion overrides the opt-in
  // rather than merely defaulting it off — the setting can be switched on
  // after the visitor has already pressed the button.
  const rotating = spin && !reducedMotion
  useEffect(() => {
    stageRef.current?.setAutoRotate(rotating)
  }, [rotating])

  const dimensions = `${String(SCULPTURE.heightCm)} × ${String(SCULPTURE.widthCm)} × ${String(SCULPTURE.depthCm)} ${t.cm}`
  const caption = `${t.sculptMedium} · ${dimensions} · ${String(SCULPTURE.year)}`

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-canvas-sculpt text-ink-museum">
      {/* The canvas is decorative to assistive tech; sculptSr below carries
          the description, and the caption carries the real dimensions. */}
      <div ref={hostRef} aria-hidden="true" className="absolute inset-0" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_50%_46%,transparent_46%,rgba(6,4,3,0.72)_100%)]"
      />

      {/* Chrome floats over the scene, so it stays transparent to the pointer
          and lets a drag anywhere orbit the piece; only the controls take
          pointer events back. */}
      <main
        id="main"
        tabIndex={-1}
        className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between outline-none"
      >
        <header className="flex flex-col gap-4 bg-gradient-to-b from-canvas-sculpt from-55% to-transparent p-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:bg-none sm:p-7">
          <div className="max-w-[46ch]">
            <p className="text-[11px] tracking-[0.25em] text-muted-dim sm:text-xs">
              {t.sculptKicker}
            </p>
            <h1 className="mt-1.5 font-display text-3xl leading-tight font-bold sm:text-5xl">{t.sculptName}</h1>
            <p className="mt-2 text-xs text-muted-dim">{caption}</p>
            <p className="sr-only">{t.sculptSr}</p>
            {/* The old page's flex row dropped the quote under the back-link
                instead of under the title it belongs to. */}
            <blockquote className="mt-3.5 font-display text-[15px] leading-loose text-[#d8c9a4] italic sm:text-[17px]">
              {t.sculptQuote}
            </blockquote>
          </div>

          <nav aria-label={t.navLabel} className="pointer-events-auto flex shrink-0 flex-wrap items-center gap-2">
            <Link to={ROUTES.museum} className={LINK_CLASS}>
              {t.sculptBackMuseum}
            </Link>
            <Link to={ROUTES.home} className={LINK_CLASS}>
              {t.home}
            </Link>
            {/* Hidden, not disabled, when the visitor has asked for less
                motion: a control they must never use is only noise. */}
            {!failed && !reducedMotion && (
              <button
                type="button"
                aria-pressed={spin}
                onClick={() => setSpin((on) => !on)}
                className={`${LINK_CLASS} cursor-pointer aria-pressed:border-brand-gold aria-pressed:text-brand-gold-bright`}
              >
                {t.sculptSpin}
              </button>
            )}
            
          </nav>
        </header>

        {!failed && (
          <p className="p-5 text-center text-xs leading-relaxed text-muted-dim sm:max-w-[46ch] sm:p-7 sm:text-start">
            {t.sculptHint}
          </p>
        )}
      </main>

      {failed && (
        <div
          role="alert"
          className="pointer-events-none absolute inset-x-5 top-1/2 z-30 -translate-y-1/2 text-center leading-loose sm:inset-x-10"
        >
          <p className="text-base">{t.sculptFailed}</p>
          <p className="mt-2 text-sm text-muted-dim">
            {t.sculptName} — {caption}
          </p>
        </div>
      )}
    </div>
  )
}
