import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { Artwork } from '../components/Artwork'
import { Dialog } from '../components/Dialog'
import { Notice } from '../components/Notice'
import { ARTWORKS, GALLERY_ARTWORKS } from '../data/artworks'
import { PORTFOLIO_URL, ROUTES } from '../data/site'
import { useLang } from '../i18n/useLang'
import { useFinePointer } from '../hooks/useFinePointer'
import { usePaintCanvas } from './usePaintCanvas'

/** The horizontal rhythm the whole page shares. */
const SHELL = 'px-[clamp(18px,5vw,48px)]'

/**
 * The editorial grid, and the audit's only S1 fixed.
 *
 * The legacy layout was `repeat(6, 1fr)` with fixed pixel heights and no media
 * query at all, so on a 390px phone every painting became an unreadable sliver
 * and `overflow-x: hidden` quietly clipped what was left. Below 700px this is
 * one column of aspect-ratio boxes; the six-column composition only starts once
 * there is room for it.
 *
 * Indexing is modular so the layout survives the collection changing size — it
 * currently has five gallery pieces, and 3+3 / 2+2+2 still fills whole rows.
 */
const LAYOUT: readonly { span: string; frame: string }[] = [
  { span: 'min-[700px]:col-span-3', frame: 'min-[700px]:h-[420px]' },
  { span: 'min-[700px]:col-span-3', frame: 'min-[700px]:h-[420px]' },
  { span: 'min-[700px]:col-span-2', frame: 'min-[700px]:h-[340px]' },
  { span: 'min-[700px]:col-span-2', frame: 'min-[700px]:h-[340px]' },
  { span: 'min-[700px]:col-span-2', frame: 'min-[700px]:h-[340px]' },
  { span: 'min-[700px]:col-span-6', frame: 'min-[700px]:h-[460px]' },
]

function layoutFor(i: number): { span: string; frame: string } {
  return LAYOUT[i % LAYOUT.length] ?? { span: '', frame: '' }
}

/**
 * The piece shown beside the about text.
 *
 * The legacy page had an empty portrait drop-zone here and the README carried a
 * "drop in a photo of the artist" TODO. There is no artist to photograph — Nadim
 * is invented — so the slot is not waiting for anything: it shows a painting
 * from the collection, captioned as that painting, with no face implied. That is
 * why `portraitAlt` is gone from the strings rather than left unused.
 */
const ABOUT_PIECE = ARTWORKS.find((a) => !a.inGallery)

export function Gallery() {
  const { t } = useLang()
  const [introOpen, setIntroOpen] = useState(true)
  const { layerRef, notice, dismissNotice, clear, splash } = usePaintCanvas(!introOpen)
  const fine = useFinePointer()
  const entered = useRef(false)

  const enter = useCallback(() => setIntroOpen(false), [])

  // Runs after the overlay has left the DOM, so the scroll position the splash
  // reads is the real one and focus lands on a <main> that is actually visible.
  useEffect(() => {
    if (introOpen || entered.current) return
    entered.current = true
    splash()
    document.getElementById('main')?.focus()
  }, [introOpen, splash])

  /**
   * In-page jumps cannot be plain `href="#works"`: the app runs on HashRouter,
   * which owns location.hash, so the browser's own anchor jump would be read as
   * a route change to /works. The link keeps its semantics; the scroll is ours.
   */
  const jump = useCallback((e: MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    el.focus({ preventScroll: true })
  }, [])

  const navLink = 'inline-flex min-h-11 items-center text-ink hover:text-brand-gold'

  return (
    <div className="relative min-h-screen bg-canvas pt-[var(--demo-bar)] text-ink">
      <Dialog open={introOpen} onClose={enter} className="bg-canvas">
        {(titleId) => (
          // The dialog's own box is content-sized, so a percentage width here
          // would have nothing stable to resolve against; 3rem is the Dialog's
          // own padding on both sides.
          <div className="flex w-[min(48rem,calc(100vw-3rem))] items-stretch">
            <div
              aria-hidden="true"
              className="w-[12%] shrink-0 origin-top bg-brand-red min-[700px]:w-[18%]"
              style={{ animation: 'dripGrow 1.1s cubic-bezier(.7,0,.3,1) both' }}
            />
            <div
              className="flex-1 px-5 py-10 text-center"
              style={{ animation: 'introFade 1.2s .4s cubic-bezier(.2,.8,.2,1) both' }}
            >
              <p className="mb-3.5 text-sm font-medium tracking-[0.3em] text-brand-gold">{t.introWarn}</p>
              {/* h2, not h1: the hero below is the page's one h1, and the
                  overlay's accessible name comes from aria-labelledby anyway. */}
              <h2
                id={titleId}
                className="mb-5 font-display text-[clamp(30px,7vw,50px)] leading-[1.35] font-bold"
              >
                {t.introTitle1}
                <br />
                {t.introTitle2}
              </h2>
              <p className="mx-auto mb-10 max-w-[440px] text-[17px] leading-[1.9] font-light text-[#b8b0a4]">
                {t.introBody}
              </p>
              <button
                type="button"
                onClick={enter}
                className="min-h-11 cursor-pointer bg-ink px-8 py-4 text-[17px] font-medium tracking-wide text-canvas hover:bg-brand-red hover:text-white"
              >
                {t.introEnter}
              </button>
            </div>
            <div
              aria-hidden="true"
              className="w-[8%] shrink-0 origin-bottom bg-brand-blue min-[700px]:w-[12%]"
              style={{ animation: 'dripGrow 1.1s .25s cubic-bezier(.7,0,.3,1) both' }}
            />
          </div>
        )}
      </Dialog>

      <a
        href="#main"
        onClick={(e) => jump(e, 'main')}
        className="sr-only-focusable z-[200] inline-flex min-h-11 items-center bg-ink px-4 py-2.5 text-canvas"
      >
        {t.skip}
      </a>

      <header className={`relative z-[5] flex flex-wrap items-center justify-between gap-3.5 py-4.5 ${SHELL}`}>
        <Link to={ROUTES.home} className="font-display text-[clamp(19px,5vw,24px)] font-bold text-ink hover:text-brand-gold">
          {t.brand} <span aria-hidden="true" className="text-brand-red">·</span>
        </Link>
        <nav aria-label={t.navLabel} className="flex flex-wrap items-center gap-x-[clamp(14px,3.4vw,30px)] gap-y-1 text-[15px]">
          <a href="#works" onClick={(e) => jump(e, 'works')} className={navLink}>
            {t.navWorks}
          </a>
          <a href="#about" onClick={(e) => jump(e, 'about')} className={navLink}>
            {t.navAbout}
          </a>
          <a href="#contact" onClick={(e) => jump(e, 'contact')} className={navLink}>
            {t.navContact}
          </a>
          <Link to={ROUTES.museum} className={navLink}>
            {t.navMuseum}
          </Link>
          
        </nav>
      </header>

      <main id="main" tabIndex={-1} className="relative z-[5] outline-none">
        <section
          aria-labelledby="hero-h"
          className={`relative isolate flex min-h-[72vh] flex-col justify-center overflow-hidden pt-8 pb-18 ${SHELL}`}
        >
          {/* Decorative colour fields, desktop only: at phone widths the body
              copy runs straight across them and #b8b0a4 on red is unreadable. */}
          <div aria-hidden="true" className="absolute top-[8%] end-0 -z-10 hidden h-[58vh] w-[34vw] bg-brand-red min-[700px]:block" />
          <div aria-hidden="true" className="absolute bottom-0 end-[26vw] -z-10 hidden h-[22vh] w-[16vw] bg-brand-blue min-[700px]:block" />
          <p className="mb-4.5 text-sm tracking-[0.3em] text-brand-gold">{t.heroKicker}</p>
          <h1 id="hero-h" className="max-w-[14ch] font-display text-[clamp(48px,9.5vw,136px)] leading-[1.12] font-bold">
            {t.heroTitle1}
            <br />
            {t.heroTitle2}
          </h1>
          <p className="mt-7 max-w-[520px] text-lg leading-[1.9] font-light text-[#b8b0a4]">{t.heroBody}</p>
          <div
            className="mt-14 flex items-center gap-3.5"
            style={{ animation: 'pulseHint 2.6s ease-in-out infinite' }}
          >
            <div aria-hidden="true" className="h-px w-10 bg-ink" />
            <span className="text-[13px] tracking-[0.2em] text-[#b8b0a4]">
              {fine ? t.heroHintFine : t.heroHintCoarse}
            </span>
          </div>
        </section>

        <section id="works" tabIndex={-1} aria-labelledby="works-h" className={`pt-15 pb-30 ${SHELL}`}>
          <div className="mb-12 flex flex-wrap items-baseline gap-5">
            <h2 id="works-h" className="font-display text-[clamp(28px,7vw,42px)] font-bold">
              {t.galleryTitle}
            </h2>
            <span className="text-sm text-muted">{t.galleryYears}</span>
          </div>
          <div className="grid grid-cols-1 gap-[22px] min-[700px]:grid-cols-6 min-[700px]:gap-7">
            {GALLERY_ARTWORKS.map((art, i) => {
              const { span, frame } = layoutFor(i)
              return (
                <Artwork
                  key={art.id}
                  art={art}
                  className={`transition-transform duration-500 ease-out min-[700px]:hover:-translate-y-2 min-[700px]:focus-within:-translate-y-2 ${span}`}
                  frameClassName={`aspect-[4/3] min-[700px]:aspect-auto ${frame}`}
                />
              )
            })}
          </div>
        </section>

        <section
          id="about"
          tabIndex={-1}
          aria-labelledby="about-h"
          className={`bg-brand-blue py-[clamp(56px,12vw,100px)] ${SHELL}`}
        >
          <div className="mx-auto grid max-w-[1100px] grid-cols-1 items-center gap-9 min-[700px]:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] min-[700px]:gap-16">
            {ABOUT_PIECE ? (
              <Artwork
                art={ABOUT_PIECE}
                className="shadow-[10px_10px_0_var(--color-canvas)] min-[700px]:-rotate-2 min-[700px]:shadow-[18px_18px_0_var(--color-canvas)]"
                frameClassName="aspect-[4/5]"
              />
            ) : null}
            <div>
              <h2 id="about-h" className="mb-5 font-display text-[clamp(28px,7vw,42px)] font-bold text-white">
                {t.aboutTitle}
              </h2>
              {/* The prose below is good copy and it stays — but it is written
                  in the first person by someone who does not exist, so it is
                  framed as a quotation and signed as one. A visitor can read it
                  as the character's voice and never as a real cv. */}
              <p className="mb-6 border-s-2 border-white/45 ps-4 text-[15px] leading-7 font-light text-white/90">
                {t.aboutNote}
              </p>
              <blockquote className="m-0">
                <p className="mb-4.5 text-[17px] leading-8 font-light text-[#dfe5f8]">{t.aboutP1}</p>
                <p className="text-[17px] leading-8 font-light text-[#dfe5f8]">{t.aboutP2}</p>
                <footer className="mt-5 text-sm text-white/80">
                  {'— '}
                  <cite className="not-italic">{t.aboutCite}</cite>
                </footer>
              </blockquote>
            </div>
          </div>
        </section>

        <section
          id="contact"
          tabIndex={-1}
          aria-labelledby="contact-h"
          className={`relative isolate overflow-hidden py-[clamp(64px,14vw,120px)] text-center ${SHELL}`}
        >
          <div aria-hidden="true" className="absolute top-0 start-0 -z-10 h-full w-[22vw] bg-brand-gold opacity-[0.12]" />
          <h2 id="contact-h" className="mb-4 font-display text-[clamp(28px,7.5vw,46px)] font-bold">
            {t.contactTitle}
          </h2>
          <p className="mx-auto mb-9 max-w-[420px] text-base leading-[1.9] font-light text-[#b8b0a4]">
            {t.contactBody}
          </p>
          {/* There is no artist and no address: this used to be a mailto to
              hello@example.com. It goes to the portfolio of the person who
              built the demo, which is the only real thing to send anyone to. */}
          <a
            href={PORTFOLIO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center bg-brand-red px-11 py-4 text-base font-medium text-white hover:bg-[#b93222]"
          >
            {t.contactBtn}
          </a>
        </section>
      </main>

      <footer
        className={`relative z-[5] flex flex-wrap items-center justify-between gap-4 border-t border-line py-6.5 text-[13px] text-muted ${SHELL}`}
      >
        <span>{t.footer}</span>
        <button
          type="button"
          onClick={clear}
          className="min-h-11 cursor-pointer border border-line px-4.5 text-[13px] whitespace-nowrap text-muted hover:border-muted hover:text-ink"
        >
          {t.reset}
        </button>
      </footer>

      <Notice code={notice} onDismiss={dismissNotice} />

      {/* The visitor's painting sits over the whole page but never takes a
          click; the hook listens on window instead. */}
      <div ref={layerRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-40" />
    </div>
  )
}
