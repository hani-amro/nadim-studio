/**
 * The cinematic museum: a scroll-driven walk down a CSS-3D corridor past the
 * eight paintings, with a study room, a guest book, a map plaque and a mirror
 * at the end.
 *
 * The camera lives in useCorridor(); this file is the scene and the chrome.
 * Two conventions are worth stating up front:
 *
 *  - Inside the 3D world, physical `left`/`right`/`translateX` is correct. A
 *    wall is on one side of the corridor no matter which way the page reads.
 *    Every piece of page chrome outside the world uses logical properties.
 *  - Nothing in the world may hold a user-facing string of its own; the copy
 *    all comes from `t`, and every fact about a painting comes from ARTWORKS.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ARTWORKS, COUNT, artworkSrc, paintingZ } from '../data/artworks'
import { ROUTES, PORTFOLIO_URL } from '../data/site'
import { captionMeta, note, orderLabel, sizeLabel, title } from '../i18n/strings'
import { useLang } from '../i18n/useLang'
import { Dialog } from '../components/Dialog'
import { Notice, type NoticeCode } from '../components/Notice'
import { Bays } from './museum/Bays'
import { Guestbook, type GuestNote } from './museum/Guestbook'
import { MapModal } from './museum/MapModal'
import { useCorridor } from './useCorridor'

const GUESTBOOK_KEY = 'nadim-guestbook'
/** Enough for a real visit; past this the oldest signatures are dropped and
 *  the visitor is told, rather than the write silently failing on quota. */
const MAX_NOTES = 60

/** Height of each letterbox bar, and therefore the top/bottom inset of every
 *  overlay that must sit between them. */
const BAR = 52
/**
 * The top of the corridor chrome.
 *
 * The museum letterboxes its top and bottom BAR pixels. The demo notice is
 * fixed over the top of every route, so the top letterbox has to start below
 * whichever of the two is taller (--museum-top) — otherwise a notice that
 * wraps to two lines on a phone would sit on the wordmark.
 */
const TOP = 'var(--museum-top)'

function isNote(value: unknown): value is GuestNote {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Record<string, unknown>
  return typeof row.name === 'string' && typeof row.text === 'string'
}

/** Nothing read back from storage is trusted: it is another tab's data, an
 *  older schema, or a hand-edited string until proven otherwise. */
function readNotes(): { notes: GuestNote[]; notice: NoticeCode | null } {
  let raw: string | null
  try {
    raw = localStorage.getItem(GUESTBOOK_KEY)
  } catch {
    // Storage is refused outright (private mode, or a blocked third-party
    // context). Nothing signed this session will survive either, so say so.
    return { notes: [], notice: 'blocked' }
  }
  if (raw == null) return { notes: [], notice: null }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { notes: [], notice: 'corrupt' }
  }
  if (!Array.isArray(parsed)) return { notes: [], notice: 'corrupt' }
  const ok = parsed.filter(isNote)
  return { notes: ok, notice: ok.length === parsed.length ? null : 'corrupt' }
}

function writeNotes(notes: readonly GuestNote[]): NoticeCode | null {
  try {
    localStorage.setItem(GUESTBOOK_KEY, JSON.stringify(notes))
    return null
  } catch (e) {
    const full =
      e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    return full ? 'quota' : 'blocked'
  }
}

const DUST = Array.from({ length: 7 }, (_, i) => ({
  x: `${(i * 137) % 100}%`,
  y: `${25 + ((i * 53) % 70)}%`,
  size: 1 + (i % 3),
  dur: `${6 + (i % 6) * 2}s`,
  delay: `${-(i * 1.2)}s`,
}))

/** Where the three empty study frames hang on the study-room wall. */
const STUDY_FRAMES = [200, 615, 1030]

const SCENE_BACKDROP = 'radial-gradient(ellipse at 50% 40%, #2b2012 0%, #171008 45%, #0a0806 78%)'

const PLINTH: CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  transformStyle: 'preserve-3d',
  pointerEvents: 'none',
}

export function Museum() {
  const { t } = useLang()

  const [introVisible, setIntroVisible] = useState(true)
  const [focus, setFocus] = useState<number | null>(null)
  const [room, setRoom] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  const [gbOpen, setGbOpen] = useState(false)
  const [narrow, setNarrow] = useState(() => window.innerWidth < 760)
  // Restored in the lazy initialiser: reading storage is synchronous, so doing
  // it in an effect would render an empty book first and then replace it.
  const [restored] = useState(readNotes)
  const [notes, setNotes] = useState<readonly GuestNote[]>(restored.notes)
  const [notice, setNotice] = useState<NoticeCode | null>(restored.notice)

  const entering = useRef(false)
  const doorStart = useRef<HTMLDivElement>(null)
  const doorEnd = useRef<HTMLDivElement>(null)
  const introBody = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)

  const corridor = useCorridor(
    { focus, room, mapOpen, gbOpen, introVisible, narrow },
    { onFocus: setFocus, onRoom: setRoom, onNarrow: setNarrow },
  )

  // Ref callbacks are memoised rather than built inline. An inline callback is
  // a new function on every render, which makes React detach and re-attach the
  // ref — and a bay that re-registers loses the culling state the engine keeps
  // for it, so a static wall would blink every time an overlay opened.
  const paintingRefs = useMemo(() => ARTWORKS.map((_, i) => corridor.registerPainting(i)), [corridor])
  const glowRefs = useMemo(() => ARTWORKS.map((_, i) => corridor.registerGlow(i)), [corridor])
  const bayRefs = useMemo(
    () => ({
      studyDoor: corridor.registerBay('study-door', -5400, false),
      studyRoom: corridor.registerBay('study-room', -5500, false),
      lectern: corridor.registerBay('lectern', -12500, false),
      mapPlaque: corridor.registerBay('map-plaque', -650, false),
    }),
    [corridor],
  )

  // Pulled out as plain bindings: reaching a ref through `corridor.x` inside
  // JSX reads as a ref access during render (react-hooks/refs), which is what
  // the rule is there to catch. Destructuring keeps the ref identity intact.
  const {
    lookRef, worldRef, progressRef, counterRef, railRef,
    registerBay, registerMirror,
    open: openPainting, close: closePainting, enterRoom, exitRoom, beginWalk, later, reducedMotion,
  } = corridor
  const { studyDoor: studyDoorRef, studyRoom: studyRoomRef, lectern: lecternRef, mapPlaque: mapPlaqueRef } = bayRefs



  // The only <h1> used to live inside the intro overlay and disappeared the
  // moment the doors opened, leaving the page with no heading at all. It now
  // lives in the chrome, and the doors hand focus to it on the way out.
  useEffect(() => {
    if (!introVisible) heading.current?.focus()
  }, [introVisible])

  const sign = useCallback(
    (entry: GuestNote): boolean => {
      const next = [entry, ...notes].slice(0, MAX_NOTES)
      const failed = writeNotes(next)
      if (failed) {
        // Never show a note as saved when it was not.
        setNotice(failed)
        return false
      }
      setNotes(next)
      setNotice(next.length < notes.length + 1 ? 'trimmed' : null)
      return true
    },
    [notes],
  )

  const openDoors = () => {
    if (entering.current) return
    entering.current = true
    const reduce = reducedMotion()

    const body = introBody.current
    if (body) {
      body.style.transition = reduce ? '' : 'opacity .5s ease'
      body.style.opacity = '0'
    }
    const a = doorStart.current
    const b = doorEnd.current
    if (a && b && !reduce) {
      const swing = 'transform 2.1s cubic-bezier(.65,0,.25,1) .3s, filter 2.1s ease .3s'
      a.style.transition = swing
      b.style.transition = swing
      a.style.transformOrigin = 'left center'
      b.style.transformOrigin = 'right center'
      requestAnimationFrame(() => {
        a.style.transform = 'rotateY(-104deg)'
        a.style.filter = 'brightness(.55)'
        b.style.transform = 'rotateY(104deg)'
        b.style.filter = 'brightness(.55)'
      })
    }

    beginWalk()
    // Tracked by the engine so an early route change cannot fire this into an
    // unmounted tree. Reduced motion skips the 2.45s wait entirely.
    later(() => {
      entering.current = false
      setIntroVisible(false)
    }, reduce ? 0 : 2450)
  }

  const focusArt = focus == null ? undefined : ARTWORKS[focus]
  const hidden: CSSProperties = { visibility: focus != null ? 'hidden' : 'visible' }

  return (
    <>
      {/* HashRouter owns location.hash, so a bare href="#main" would be read
          as a route change to /main and land on the 404 page. Move focus
          directly instead. */}
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
        className="sr-only-focusable z-90 bg-panel-museum px-4 py-2 text-brand-gold"
      >
        {t.skip}
      </a>

      <main id="main" tabIndex={-1} className="relative block bg-canvas-museum text-ink-museum outline-none" style={{ height: '950vh' }}>
        {/* ---------------------------------------------------------- world */}
        <div
          className="fixed inset-0 overflow-hidden"
          style={{ perspective: '1150px', perspectiveOrigin: '50% 46%', background: SCENE_BACKDROP }}
        >
          <div
            ref={lookRef}
            style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', pointerEvents: 'none' }}
          >
            <div
              ref={worldRef}
              style={{
                position: 'absolute',
                inset: 0,
                transformStyle: 'preserve-3d',
                pointerEvents: 'none',
                willChange: 'transform',
              }}
            >
              <Bays registerBay={registerBay} />

              {/* -- the study room, and the archway that leads into it ---- */}
              <div ref={studyDoorRef} style={PLINTH}>
                <button
                  type="button"
                  onClick={enterRoom}
                  aria-label={t.studiesEnter}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: 440,
                    height: 700,
                    margin: '-400px -220px',
                    transform: 'translateX(-878px) translateZ(-5400px) rotateY(90deg) translateZ(6px)',
                    backfaceVisibility: 'hidden',
                    border: '4px solid rgba(217,164,65,.6)',
                    borderRadius: '220px 220px 0 0',
                    boxSizing: 'border-box',
                    background:
                      'radial-gradient(ellipse at 50% 100%, rgba(255,214,130,.42), rgba(255,214,130,.08) 55%, transparent 78%), linear-gradient(180deg, #050302, #150e07 55%, #2b2012)',
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                    font: 'inherit',
                    color: 'inherit',
                  }}
                >
                  <span style={{ position: 'absolute', left: 0, right: 0, bottom: 84, textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: 12, color: '#9a8a68' }}>{t.sculptureFrom}</span>
                    <span
                      style={{
                        display: 'block',
                        marginTop: 4,
                        fontFamily: 'var(--font-display)',
                        fontSize: 34,
                        fontWeight: 700,
                        color: '#efe7d8',
                      }}
                    >
                      {t.studiesRoom}
                    </span>
                  </span>
                </button>
              </div>

              <div ref={studyRoomRef} style={PLINTH}>
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: 340,
                    width: 1500,
                    height: 1600,
                    marginLeft: -2500,
                    transform: 'translateZ(-4700px) rotateX(-90deg)',
                    transformOrigin: 'top center',
                    background:
                      'repeating-linear-gradient(90deg, rgba(0,0,0,.28) 0 3px, transparent 3px 300px), linear-gradient(#1c1409, #0d0a06)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: -556,
                    width: 1500,
                    height: 1600,
                    marginLeft: -2500,
                    transform: 'translateZ(-4700px) rotateX(-90deg)',
                    transformOrigin: 'top center',
                    background: 'linear-gradient(#100b07, #1d1409)',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: 660,
                      width: 460,
                      height: 200,
                      marginLeft: -230,
                      border: '1px solid rgba(217,164,65,.35)',
                      background:
                        'radial-gradient(ellipse, rgba(255,238,196,.5), rgba(255,214,130,.1) 58%, transparent 80%)',
                    }}
                  />
                </div>
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: -556,
                    width: 1600,
                    height: 900,
                    marginLeft: -800,
                    transform: 'translateX(-2500px) translateZ(-5500px) rotateY(90deg)',
                    backfaceVisibility: 'hidden',
                    background: 'linear-gradient(180deg, #180f08 0 69%, #2b2012 69% 72%, #0e0905 72% 100%)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: -556,
                    width: 1500,
                    height: 900,
                    marginLeft: -2500,
                    transform: 'translateZ(-6300px)',
                    background:
                      'repeating-linear-gradient(90deg, rgba(0,0,0,.3) 0 10px, rgba(239,231,216,.035) 10px 42px, transparent 42px 300px), linear-gradient(180deg, #1d1409 0 69%, #2b2012 69% 72%, #120c06 72% 100%)',
                  }}
                >
                  <div style={{ position: 'absolute', left: 0, right: 0, top: 96, textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: 13, letterSpacing: 4, color: '#9a8a68' }}>{t.studiesLatin}</p>
                    <p
                      style={{
                        margin: '6px 0 0',
                        fontFamily: 'var(--font-display)',
                        fontSize: 40,
                        fontWeight: 700,
                        color: '#efe7d8',
                      }}
                    >
                      {t.studiesHint}
                    </p>
                  </div>
                  {/* The legacy build hung an upload widget in each of these
                      frames. There is no such widget here and no study photos
                      in the collection, so they stay honestly empty rather
                      than showing invented work — and the plaque under them
                      says so, because three finished gold frames hanging empty
                      in a room that announces "works on paper" otherwise reads
                      as a bug rather than a decision. */}
                  {STUDY_FRAMES.map((left) => (
                    <div
                      key={left}
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        left,
                        top: 300,
                        width: 270,
                        height: 300,
                        background: '#d9a441',
                        padding: 3,
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{ position: 'absolute', inset: 3, background: '#241a0c' }}>
                        <div
                          style={{
                            position: 'absolute',
                            inset: 10,
                            border: '1px solid rgba(217,164,65,.25)',
                            background: 'linear-gradient(160deg, #1b1409, #0d0a06)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <p
                    style={{
                      position: 'absolute',
                      left: 200,
                      width: 1100,
                      top: 646,
                      margin: 0,
                      padding: '20px 28px',
                      boxSizing: 'border-box',
                      textAlign: 'center',
                      fontSize: 23,
                      lineHeight: 1.75,
                      fontWeight: 300,
                      color: '#cbbc98',
                      border: '1px solid rgba(217,164,65,.35)',
                      background: 'rgba(10,8,6,.55)',
                    }}
                  >
                    {t.studiesEmpty}
                  </p>
                </div>
                {/* The work table under the window. */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: 120,
                    width: 520,
                    height: 360,
                    marginLeft: -2010,
                    transform: 'translateZ(-5320px) rotateX(-90deg)',
                    transformOrigin: 'top center',
                    border: '1px solid rgba(198,224,235,.4)',
                    boxSizing: 'border-box',
                    background: 'linear-gradient(rgba(198,224,235,.16), rgba(198,224,235,.05))',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: 120,
                    width: 520,
                    height: 220,
                    marginLeft: -2010,
                    transform: 'translateZ(-5320px)',
                    border: '1px solid rgba(217,164,65,.35)',
                    boxSizing: 'border-box',
                    background: 'linear-gradient(rgba(198,224,235,.1), rgba(198,224,235,.03))',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: 300,
                    width: 520,
                    height: 360,
                    marginLeft: -2010,
                    transform: 'translateZ(-5320px) rotateX(-90deg)',
                    transformOrigin: 'top center',
                    background: 'linear-gradient(#2b2012, #17100a)',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 46,
                      top: 64,
                      width: 190,
                      height: 10,
                      borderRadius: 3,
                      background: 'linear-gradient(90deg, #e8d9b8 0 58%, #6b5d42 58% 72%, #1d1409 72% 100%)',
                      transform: 'rotate(-7deg)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: 60,
                      top: 108,
                      width: 210,
                      height: 9,
                      borderRadius: 3,
                      background: 'linear-gradient(90deg, #d8c9a4 0 55%, #5c4622 55% 70%, #17100a 70% 100%)',
                      transform: 'rotate(4deg)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: 40,
                      top: 156,
                      width: 170,
                      height: 8,
                      borderRadius: 3,
                      background: 'linear-gradient(90deg, #e8d9b8 0 60%, #6b5d42 60% 74%, #241a0c 74% 100%)',
                      transform: 'rotate(-12deg)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: 300,
                      top: 70,
                      width: 78,
                      height: 28,
                      borderRadius: 6,
                      background: 'linear-gradient(90deg, #d43d2a 0 18%, #e7e1d3 18% 100%)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: 300,
                      top: 118,
                      width: 78,
                      height: 28,
                      borderRadius: 6,
                      background: 'linear-gradient(90deg, #2b50c8 0 18%, #e7e1d3 18% 100%)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: 300,
                      top: 166,
                      width: 78,
                      height: 28,
                      borderRadius: 6,
                      background: 'linear-gradient(90deg, #e8bc66 0 18%, #e7e1d3 18% 100%)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: 396,
                      top: 96,
                      width: 78,
                      height: 28,
                      borderRadius: 6,
                      background: 'linear-gradient(90deg, #1f7a6d 0 18%, #e7e1d3 18% 100%)',
                      transform: 'rotate(9deg)',
                    }}
                  />
                </div>
              </div>

              {/* -- the guest-book lectern at the end of the walk --------- */}
              <div ref={lecternRef} style={PLINTH}>
                <button
                  type="button"
                  onClick={() => setGbOpen(true)}
                  aria-label={t.gbOpenLabel}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: 360,
                    height: 520,
                    margin: '-180px -180px',
                    transform: 'translateX(520px) translateZ(-12500px) rotateY(-26deg)',
                    transformStyle: 'preserve-3d',
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                    background: 'none',
                    border: 0,
                    padding: 0,
                    font: 'inherit',
                    color: 'inherit',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: 200,
                      width: 74,
                      height: 340,
                      marginLeft: -37,
                      background: 'linear-gradient(90deg, #17100a, #4a3c22 45%, #1d1409)',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: 520,
                      width: 210,
                      height: 150,
                      marginLeft: -105,
                      transform: 'rotateX(-90deg)',
                      transformOrigin: 'top center',
                      background: 'radial-gradient(ellipse at 50% 0%, #3a2e1a, #120c06 78%)',
                    }}
                  />
                  <span
                    style={{
                      display: 'block',
                      position: 'absolute',
                      left: '50%',
                      top: 0,
                      width: 340,
                      height: 230,
                      marginLeft: -170,
                      transform: 'rotateX(-56deg)',
                      transformOrigin: 'bottom center',
                      background: 'linear-gradient(180deg, #4a3c22, #241a0c)',
                      borderTop: '3px solid #d9a441',
                      boxSizing: 'border-box',
                      padding: 14,
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        left: 16,
                        top: 16,
                        right: '50.5%',
                        bottom: 16,
                        background: 'linear-gradient(160deg, #efe7d8, #d8cdb4)',
                        boxShadow: 'inset -6px 0 12px rgba(0,0,0,.18)',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        left: '50.5%',
                        top: 16,
                        right: 16,
                        bottom: 16,
                        background: 'linear-gradient(200deg, #efe7d8, #d8cdb4)',
                        boxShadow: 'inset 6px 0 12px rgba(0,0,0,.18)',
                      }}
                    />
                    <span style={{ position: 'absolute', left: '54%', top: 40, width: 96, height: 2, background: 'rgba(90,70,40,.5)' }} />
                    <span style={{ position: 'absolute', left: '54%', top: 62, width: 78, height: 2, background: 'rgba(90,70,40,.35)' }} />
                    <span style={{ position: 'absolute', left: '20%', top: 52, width: 84, height: 2, background: 'rgba(90,70,40,.4)' }} />
                  </span>
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: 250,
                      textAlign: 'center',
                      fontSize: 13,
                      color: '#d9a441',
                    }}
                  >
                    {t.gbOpen}
                  </span>
                </button>
              </div>

              {/* -- the map plaque just inside the entrance --------------- */}
              <div ref={mapPlaqueRef} style={PLINTH}>
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translateX(520px) translateZ(-1500px) rotateY(-26deg)',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: 340,
                      width: 170,
                      height: 120,
                      marginLeft: -85,
                      transform: 'rotateX(-90deg)',
                      transformOrigin: 'top center',
                      background: 'radial-gradient(ellipse at 50% 0%, #4a3c22, #120c06 76%)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: 44,
                      width: 26,
                      height: 296,
                      marginLeft: -13,
                      background: 'linear-gradient(90deg, #241a0c, #b58a3c 45%, #3a2e1a)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setMapOpen(true)}
                    aria-label={t.mapTitle}
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: -346,
                      width: 560,
                      height: 390,
                      marginLeft: -280,
                      background: 'linear-gradient(160deg, #d9a441, #8a6a2e 55%, #b58a3c)',
                      padding: 4,
                      border: 0,
                      boxSizing: 'border-box',
                      boxShadow: '0 26px 40px rgba(0,0,0,.6)',
                      cursor: 'pointer',
                      pointerEvents: 'auto',
                      font: 'inherit',
                      color: 'inherit',
                      textAlign: 'start',
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        position: 'absolute',
                        inset: 4,
                        background: 'linear-gradient(160deg, #241a0c, #120c06)',
                        padding: '28px 30px',
                        boxSizing: 'border-box',
                      }}
                    >
                      <span
                        style={{
                          display: 'block',
                          fontFamily: 'var(--font-display)',
                          fontSize: 30,
                          fontWeight: 700,
                          color: '#efe7d8',
                        }}
                      >
                        {t.mapTitle}
                      </span>
                      <span style={{ display: 'block', margin: '6px 0 26px', fontSize: 14, letterSpacing: 3, color: '#9a8a68' }}>
                        {t.mapLatin}
                      </span>
                      <span style={{ display: 'block', position: 'relative', height: 96 }}>
                        <span
                          style={{
                            position: 'absolute',
                            insetInline: 0,
                            top: 36,
                            height: 2,
                            background: 'linear-gradient(90deg, #d9a441, #5c4622)',
                          }}
                        />
                        <span style={{ position: 'absolute', insetInline: 0, top: 20, display: 'flex', justifyContent: 'space-between' }}>
                          {ARTWORKS.filter((a) => a.order % 2 === 1).map((a) => (
                            <span key={a.id} style={{ width: 9, height: 9, borderRadius: '50%', background: '#d9a441' }} />
                          ))}
                        </span>
                        <span style={{ position: 'absolute', insetInline: 0, top: 46, display: 'flex', justifyContent: 'space-around' }}>
                          {ARTWORKS.filter((a) => a.order % 2 === 0).map((a) => (
                            <span key={a.id} style={{ width: 9, height: 9, borderRadius: '50%', background: '#8a6a2e' }} />
                          ))}
                        </span>
                        <span
                          style={{
                            position: 'absolute',
                            insetInlineStart: '48%',
                            top: 27,
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            border: '2px solid #d9a441',
                          }}
                        />
                      </span>
                      <span style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 15, color: '#cbbc98' }}>
                        <span>{t.mapWing1}</span>
                        <span>{t.mapWing2}</span>
                      </span>
                      <span style={{ display: 'block', marginTop: 20, fontSize: 14, color: '#b8a884' }}>{t.mapInventory}</span>
                      <span style={{ display: 'block', marginTop: 12, fontSize: 13, color: '#d9a441' }}>{t.mapZoomHint}</span>
                    </span>
                  </button>
                </div>
              </div>

              {/* -- the eight paintings ---------------------------------- */}
              {ARTWORKS.map((art, i) => {
                const side = i % 2 === 0 ? -1 : 1
                const z = paintingZ(i)
                const resting = `translateX(${side * 470}px) translateZ(${z}px) rotateY(${-side * 24}deg) rotateX(-2deg)`
                const opened = `translateX(${side * 470}px) translateZ(${z}px) rotateY(${-side * 5}deg)`
                const name = title(art)
                const meta = captionMeta(art)
                return (
                  <div
                    key={art.id}
                    ref={paintingRefs[i]}
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: 680,
                      height: 700,
                      margin: '-400px -340px',
                      // The transition itself is armed imperatively by the
                      // engine so it can be taken back off afterwards; the
                      // transform stays declarative so it can never go stale.
                      transform: focus === i ? opened : resting,
                      transformStyle: 'preserve-3d',
                      pointerEvents: 'none',
                    }}
                  >
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        top: -150,
                        left: '50%',
                        width: 640,
                        height: 470,
                        marginLeft: -320,
                        background:
                          'radial-gradient(ellipse 48% 58% at 50% 0%, rgba(255,214,130,.5), rgba(255,214,130,.12) 55%, transparent 78%)',
                      }}
                    />
                    <div
                      aria-hidden="true"
                      ref={glowRefs[i]}
                      style={{
                        position: 'absolute',
                        top: 30,
                        left: '50%',
                        width: 700,
                        height: 580,
                        transform: 'translateX(-50%) translateZ(-14px)',
                        background: 'radial-gradient(ellipse, rgba(255,214,130,.45), transparent 64%)',
                        opacity: 0,
                      }}
                    />
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        top: 30,
                        ...(side === -1 ? { right: -150 } : { left: -150 }),
                        fontFamily: 'var(--font-display)',
                        fontSize: 300,
                        fontWeight: 700,
                        lineHeight: 1,
                        color: 'rgba(217,164,65,.14)',
                        transform: 'translateZ(-90px)',
                      }}
                    >
                      {orderLabel(art.order)}
                    </div>
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        top: -156,
                        left: '50%',
                        marginLeft: -86,
                        width: 2,
                        height: 152,
                        background: 'linear-gradient(rgba(217,164,65,0), rgba(217,164,65,.5) 40%, rgba(217,164,65,.75))',
                      }}
                    />
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        top: -156,
                        left: '50%',
                        marginLeft: 84,
                        width: 2,
                        height: 152,
                        background: 'linear-gradient(rgba(217,164,65,0), rgba(217,164,65,.5) 40%, rgba(217,164,65,.75))',
                      }}
                    />
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        top: -6,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 220,
                        height: 10,
                        borderRadius: 5,
                        background: 'linear-gradient(#5c4622, #241a0c)',
                        boxShadow: '0 3px 14px rgba(255,220,150,.55)',
                      }}
                    />

                    {/* Was a bare <div onClick>: unreachable by keyboard, with
                        no role and no name. It is a real button now. */}
                    <button
                      type="button"
                      onClick={() => openPainting(i)}
                      aria-label={`${t.openLabel} ${name} ${t.closerSuffix}`}
                      style={{
                        position: 'absolute',
                        top: 56,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'block',
                        width: 620,
                        background: '#d9a441',
                        padding: 3,
                        border: 0,
                        boxShadow: '0 20px 44px rgba(0,0,0,.8)',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        font: 'inherit',
                        color: 'inherit',
                      }}
                    >
                      <span style={{ display: 'block', background: '#241a0c', padding: 14 }}>
                        <span
                          style={{
                            display: 'block',
                            position: 'relative',
                            border: '1px solid rgba(217,164,65,.6)',
                            padding: 10,
                            background: '#0b0805',
                          }}
                        >
                          <img
                            src={artworkSrc(art)}
                            alt={`${name} — ${meta}`}
                            draggable={false}
                            style={{ display: 'block', width: '100%', height: 440, objectFit: 'cover' }}
                          />
                          <span
                            aria-hidden="true"
                            style={{
                              position: 'absolute',
                              inset: 10,
                              background:
                                'linear-gradient(90deg, rgba(0,0,0,.36), rgba(0,0,0,.1) 18%, rgba(255,246,224,.05) 44%, rgba(255,246,224,.05) 56%, rgba(0,0,0,.12) 82%, rgba(0,0,0,.32)), linear-gradient(180deg, rgba(255,238,196,.07), transparent 26%)',
                            }}
                          />
                          <span
                            aria-hidden="true"
                            style={{
                              position: 'absolute',
                              bottom: 14,
                              left: 14,
                              width: 38,
                              height: 38,
                              borderRadius: '50%',
                              border: '1px solid #d9a441',
                              color: '#d9a441',
                              background: 'rgba(10,8,6,.65)',
                              display: focus === i ? 'none' : 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 20,
                              animation: 'plusPulse 2.4s ease-out infinite',
                            }}
                          >
                            +
                          </span>
                        </span>
                      </span>
                    </button>

                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        left: 27,
                        top: 702,
                        width: 626,
                        height: 20,
                        transform: 'translateZ(40px)',
                        borderRadius: '0 0 60% 60% / 0 0 100% 100%',
                        background: 'linear-gradient(180deg, #a3242f, #5d1018)',
                        boxShadow: 'inset 0 3px 6px rgba(255,255,255,.12)',
                      }}
                    />
                    <div style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 34, color: '#efe7d8', textShadow: '0 2px 20px rgba(0,0,0,.9)' }}>
                        {name}
                      </p>
                      <p style={{ margin: '6px 0 0', fontSize: 13, color: '#c9b98e' }}>
                        {meta} · {orderLabel(art.order)}
                      </p>
                      <p
                        aria-hidden="true"
                        style={{ margin: '10px 0 0', fontSize: 12, color: '#8d7c58', border: '1px solid #3a2e1a', padding: '6px 16px', display: 'inline-block' }}
                      >
                        {t.openCloser}
                      </p>
                    </div>
                  </div>
                )
              })}

              {/* -- wing labels, rotunda, mirror and end wall ------------- */}
              <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', pointerEvents: 'none', ...hidden }}>
                <div style={{ position: 'absolute', left: '50%', top: 'calc(50% - 330px)', transform: 'translateZ(-1550px)', textAlign: 'center', width: 600, margin: '-60px -300px', opacity: 0.8 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 13, color: '#9a8a68' }}>{t.wing1Label}</p>
                  <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 46, fontWeight: 700, color: 'rgba(239,231,216,.85)' }}>{t.wing1}</p>
                </div>
                <div style={{ position: 'absolute', left: '50%', top: 'calc(50% - 330px)', transform: 'translateZ(-6820px)', textAlign: 'center', width: 600, margin: '-60px -300px', opacity: 0.8 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 13, color: '#9a8a68' }}>{t.wing2Label}</p>
                  <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 46, fontWeight: 700, color: 'rgba(239,231,216,.85)' }}>{t.wing2}</p>
                </div>
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: 'calc(50% + 328px)',
                    width: 940,
                    height: 940,
                    margin: '0 0 0 -470px',
                    transform: 'translateZ(-6350px) rotateX(-90deg)',
                    transformOrigin: 'top center',
                    border: '3px solid rgba(217,164,65,.5)',
                    borderRadius: '50%',
                    boxShadow: 'inset 0 0 80px rgba(217,164,65,.15)',
                  }}
                >
                  <div style={{ position: 'absolute', inset: 180, border: '1px solid rgba(217,164,65,.35)', borderRadius: '50%' }} />
                </div>
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: 'calc(50% - 400px)',
                    width: 16,
                    height: 16,
                    margin: -8,
                    transform: 'translateZ(-6820px)',
                    borderRadius: '50%',
                    background: '#ffe9b0',
                    boxShadow: '0 0 60px 24px rgba(255,225,160,.6)',
                  }}
                />

                {/* Doorway through to the sculpture room. */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: 540,
                    height: 800,
                    margin: '-450px -270px',
                    transform: 'translateX(-880px) translateZ(-6820px) rotateY(90deg) translateZ(4px)',
                    backfaceVisibility: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      border: '4px solid rgba(217,164,65,.55)',
                      borderRadius: '270px 270px 0 0',
                      boxSizing: 'border-box',
                      background: 'linear-gradient(180deg, #050302, #150e07 55%, #2b2012)',
                      boxShadow: 'inset 0 0 90px rgba(0,0,0,.95)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      bottom: 0,
                      width: 400,
                      height: 440,
                      marginLeft: -200,
                      background: 'radial-gradient(ellipse at 50% 100%, rgba(255,214,130,.4), transparent 74%)',
                    }}
                  />
                  <div style={{ position: 'absolute', left: '50%', bottom: 96, width: 340, marginLeft: -170, textAlign: 'center' }}>
                    <p style={{ margin: '0 0 6px', fontSize: 13, color: '#9a8a68' }}>{t.sculptureFrom}</p>
                    <Link
                      to={ROUTES.sculpture}
                      style={{
                        display: 'inline-block',
                        minHeight: 44,
                        fontFamily: 'var(--font-display)',
                        fontSize: 40,
                        fontWeight: 700,
                        color: '#efe7d8',
                        pointerEvents: 'auto',
                      }}
                    >
                      {t.sculptureRoom}
                    </Link>
                    <p style={{ margin: '8px 0 0', fontSize: 12, letterSpacing: 3, color: '#d9a441' }}>{t.sculptLatin}</p>
                  </div>
                </div>

                {/* "The last painting in the show is you." */}
                <div
                  ref={registerMirror}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: 500,
                    height: 700,
                    margin: '-360px -250px',
                    transform: 'translateX(-470px) translateZ(-12150px) rotateY(22deg)',
                    opacity: 0,
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: -170,
                      left: '50%',
                      width: 620,
                      height: 560,
                      transform: 'translateX(-50%)',
                      background: 'radial-gradient(ellipse 48% 58% at 50% 0%, rgba(255,214,130,.45), transparent 76%)',
                    }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: '#d9a441', padding: 4 }}>
                    <div
                      style={{
                        position: 'absolute',
                        inset: 4,
                        background: 'linear-gradient(160deg, #1c1610 0%, #0d0a07 55%, #16110b 100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 18,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          top: '-20%',
                          left: '-40%',
                          width: '60%',
                          height: '140%',
                          background: 'linear-gradient(105deg, transparent 44%, rgba(239,231,216,.07) 50%, transparent 56%)',
                          transform: 'rotate(4deg)',
                        }}
                      />
                      <p style={{ margin: 0, fontSize: 15, color: '#9a8a68' }}>{t.mirrorLead}</p>
                      <p
                        style={{
                          margin: 0,
                          fontFamily: 'var(--font-display)',
                          fontSize: 120,
                          fontWeight: 700,
                          color: '#efe7d8',
                          textShadow: '0 0 50px rgba(255,214,130,.35)',
                        }}
                      >
                        {t.mirrorYou}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: '#a8977a' }}>{t.mirrorHint}</p>
                    </div>
                  </div>
                </div>

                {/* The end wall. */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: 900,
                    height: 700,
                    margin: '-350px -450px',
                    transform: 'translateZ(-13000px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    gap: 26,
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: -180,
                      left: '50%',
                      width: 900,
                      height: 760,
                      transform: 'translateX(-50%)',
                      background: 'radial-gradient(ellipse 48% 55% at 50% 0%, rgba(255,214,130,.45), transparent 72%)',
                    }}
                  />
                  <p style={{ margin: 0, fontSize: 14, color: '#d9a441' }}>
                    {t.endKicker} — <span style={{ letterSpacing: 5 }}>{t.endLatin}</span>
                  </p>
                  <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 68, fontWeight: 700, lineHeight: 1.3 }}>{t.endTitle}</h2>
                  <p style={{ margin: 0, fontSize: 17, color: '#cbbc98', fontWeight: 300, maxWidth: 420, lineHeight: 2 }}>{t.endBody}</p>
                  <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <a
                      href={PORTFOLIO_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-block', minHeight: 44, fontSize: 16, padding: '15px 48px', border: '1px solid #d9a441', color: '#d9a441', pointerEvents: 'auto' }}
                    >
                      {t.contactBtn}
                    </a>
                    <button
                      type="button"
                      onClick={() => setGbOpen(true)}
                      style={{
                        minHeight: 44,
                        font: 'inherit',
                        fontSize: 16,
                        padding: '15px 40px',
                        background: 'rgba(217,164,65,.12)',
                        border: '1px solid #4a3c22',
                        color: '#efe7d8',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                      }}
                    >
                      {t.gbOpen}
                    </button>
                    <Link
                      to={ROUTES.sculpture}
                      style={{
                        display: 'inline-block',
                        minHeight: 44,
                        fontSize: 16,
                        padding: '15px 40px',
                        border: '1px solid #4a3c22',
                        color: '#efe7d8',
                        background: 'rgba(217,164,65,.12)',
                        pointerEvents: 'auto',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t.sculptureRoom}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {DUST.map((d, i) => (
            <div
              key={i}
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: d.x,
                top: d.y,
                width: d.size,
                height: d.size,
                borderRadius: '50%',
                background: '#ffe9b0',
                opacity: 0,
                animation: `dust ${d.dur} linear ${d.delay} infinite`,
                pointerEvents: 'none',
              }}
            />
          ))}
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(0,0,0,.62) 100%)' }} />
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'repeating-linear-gradient(0deg, rgba(255,255,255,.02) 0 2px, transparent 2px 6px)' }} />
        </div>

        {/* ---------------------------------------------------------- chrome */}
        <div aria-hidden="true" className="fixed inset-x-0 top-0 z-20 bg-black" style={{ height: TOP }} />

        <header className="pointer-events-none fixed inset-x-0 z-20 flex items-start justify-between gap-3 px-5 py-4 sm:px-7" style={{ top: TOP }}>
          <h1
            ref={heading}
            tabIndex={-1}
            className="pointer-events-auto relative m-0 font-display text-lg font-bold text-ink-museum outline-none sm:text-xl"
          >
            {t.brand}
            <span
              aria-hidden="true"
              className="absolute inset-x-0 -bottom-1.5 block h-[3px] bg-[linear-gradient(90deg,transparent,#d9a441_30%,#ffe9b0_60%,#d9a441)]"
              style={{ transform: 'skewX(-24deg)', animation: 'brushIn 1.5s .4s cubic-bezier(.2,.8,.2,1) both' }}
            />
          </h1>
          <nav aria-label={t.navLabel} className="pointer-events-auto flex shrink-0 items-center gap-2 sm:gap-4">
            <Link to={ROUTES.home} className="flex min-h-11 items-center px-1 text-sm text-brand-gold hover:text-brand-gold-bright">
              {t.home}
            </Link>
            <a
              href={PORTFOLIO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center px-1 text-sm text-brand-gold hover:text-brand-gold-bright"
            >
              {t.portfolio}
            </a>
            
          </nav>
        </header>

        <div className="fixed inset-x-0 bottom-0 z-20 flex h-13 items-center justify-between gap-4 bg-black px-4 sm:px-7">
          <span
            className="hidden text-[11px] text-muted-museum md:inline"
            style={{ animation: 'pulseHint 2.8s ease-in-out infinite' }}
          >
            {t.walkHint} — <span className="tracking-[0.25em]">{t.walkHintLatin}</span>
          </span>
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => setMapOpen(true)}
              className="min-h-11 cursor-pointer border border-line-museum bg-transparent px-3 text-[11px] text-brand-gold hover:border-brand-gold"
            >
              {t.mapBtn}
            </button>
            {/* The counter and the rail are two readings of one value; the
                rail carries the accessible name, so the digits are decorative. */}
            <span ref={counterRef} dir="ltr" aria-hidden="true" className="inline-block min-w-11 text-start text-xs text-brand-gold">
              1 / {COUNT}
            </span>
            <div
              ref={railRef}
              role="progressbar"
              aria-label={t.progressLabel}
              aria-valuemin={1}
              aria-valuemax={COUNT}
              aria-valuenow={1}
              className="h-0.5 w-24 bg-panel-deep md:w-[220px]"
            >
              <div ref={progressRef} className="h-full w-0 bg-[linear-gradient(90deg,#d9a441,#ffe9b0)]" />
            </div>
          </div>
        </div>

        {room && (
          <div className="fixed inset-x-0 z-30 flex justify-center px-4" style={{ top: `calc(${TOP} + 24px)`, animation: 'fadeInUp .8s .4s ease both' }}>
            <div className="flex items-center gap-3 border border-line-museum bg-[rgba(10,8,6,.8)] px-4 py-2 sm:gap-4">
              <span className="font-display text-lg text-ink-museum">{t.studiesRoom}</span>
              <span className="hidden text-xs text-muted-dim sm:inline">{t.studiesHint}</span>
              <button
                type="button"
                onClick={exitRoom}
                className="min-h-11 cursor-pointer border border-line-museum bg-brand-gold/10 px-4 text-sm text-ink-museum hover:border-brand-gold"
              >
                {t.studiesBack}
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------- focus */}
        {focus != null && focusArt != null && (
          <FocusPanel
            index={focus}
            narrow={narrow}
            onClose={closePainting}
          />
        )}

        <MapModal open={mapOpen} onClose={() => setMapOpen(false)} />
        <Guestbook
          open={gbOpen}
          onClose={() => setGbOpen(false)}
          notes={notes}
          onSign={sign}
        />

        {/* ---------------------------------------------------------- intro */}
        <Dialog open={introVisible} onClose={() => setIntroVisible(false)} dismissable={false}>
          {(titleId) => (
            <div
              className="fixed inset-0 flex items-center justify-center overflow-hidden text-center"
              style={{ perspective: '1600px' }}
            >
              <div
                ref={doorStart}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  right: '50%',
                  width: '50.5%',
                  background: 'linear-gradient(100deg, #2a1e0e, #1a1209 55%, #140d07)',
                  borderLeft: '2px solid #d9a441',
                  boxShadow: 'inset -60px 0 100px rgba(0,0,0,.55)',
                }}
              >
                <div style={{ position: 'absolute', top: '6%', bottom: '46%', left: '14%', right: '12%', border: '2px solid rgba(217,164,65,.42)', background: 'linear-gradient(120deg, rgba(217,164,65,.06), transparent 60%)', boxShadow: 'inset 0 0 40px rgba(0,0,0,.5)' }} />
                <div style={{ position: 'absolute', top: '58%', bottom: '8%', left: '14%', right: '12%', border: '2px solid rgba(217,164,65,.42)', boxShadow: 'inset 0 0 40px rgba(0,0,0,.5)' }} />
                <div style={{ position: 'absolute', top: '50%', right: 30, width: 12, height: 90, marginTop: -45, borderRadius: 6, background: 'linear-gradient(#ffe9b0, #d9a441)', boxShadow: '0 0 20px rgba(255,225,160,.6)' }} />
              </div>
              <div
                ref={doorEnd}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: '50%',
                  width: '50.5%',
                  background: 'linear-gradient(-100deg, #2a1e0e, #1a1209 55%, #140d07)',
                  borderRight: '2px solid #d9a441',
                  boxShadow: 'inset 60px 0 100px rgba(0,0,0,.55)',
                }}
              >
                <div style={{ position: 'absolute', top: '6%', bottom: '46%', right: '14%', left: '12%', border: '2px solid rgba(217,164,65,.42)', background: 'linear-gradient(-120deg, rgba(217,164,65,.06), transparent 60%)', boxShadow: 'inset 0 0 40px rgba(0,0,0,.5)' }} />
                <div style={{ position: 'absolute', top: '58%', bottom: '8%', right: '14%', left: '12%', border: '2px solid rgba(217,164,65,.42)', boxShadow: 'inset 0 0 40px rgba(0,0,0,.5)' }} />
                <div style={{ position: 'absolute', top: '50%', left: 30, width: 12, height: 90, marginTop: -45, borderRadius: 6, background: 'linear-gradient(#ffe9b0, #d9a441)', boxShadow: '0 0 20px rgba(255,225,160,.6)' }} />
              </div>

              <div ref={introBody} className="relative w-full max-w-[720px] px-6">
                <p className="absolute inset-x-0 -top-24 m-0 text-base text-muted-dim" style={{ wordSpacing: 8, animation: 'titleLine 7s ease both' }}>
                  {t.museumIntro1}
                </p>
                <p className="absolute inset-x-0 -top-24 m-0 text-base text-muted-dim" style={{ wordSpacing: 8, animation: 'titleLine 7s 2.4s ease both' }}>
                  {t.museumIntro2}
                </p>
                <h2
                  id={titleId}
                  className="mt-0 mb-4 font-display font-bold text-ink-museum"
                  style={{ fontSize: 'clamp(36px, 7vw, 84px)', animation: 'titleStay 8s ease both' }}
                >
                  {t.museumIntroTitle}
                </h2>
                <p className="mt-0 mb-12 text-sm tracking-[0.25em] text-brand-gold" style={{ animation: 'btnIn 9s ease both' }}>
                  {t.museumIntroSub}
                </p>
                <button
                  type="button"
                  onClick={openDoors}
                  className="min-h-11 cursor-pointer border border-brand-gold bg-transparent px-10 py-4 text-base whitespace-nowrap text-brand-gold hover:bg-brand-gold hover:text-black"
                  style={{ animation: 'btnIn 9.5s ease both' }}
                >
                  {t.museumEnter}
                </button>
              </div>
            </div>
          )}
        </Dialog>

        <Notice code={notice} onDismiss={() => setNotice(null)} />
      </main>
    </>
  )
}

/**
 * The panel that opens when a painting is selected.
 *
 * It is a real <Dialog>: the corridor behind it is frozen and untabbable while
 * it is up. Its children are `fixed`-positioned, so they escape the dialog's
 * centring box and can sit against the edge of the screen the way the legacy
 * layout did. The physical left/right here follows the painting's side of the
 * corridor, which is world geometry, not text direction.
 */
function FocusPanel({ index, narrow, onClose }: { index: number; narrow: boolean; onClose: () => void }) {
  const { t } = useLang()
  const art = ARTWORKS[index]
  if (!art) return null

  const side = index % 2 === 0 ? -1 : 1
  // side -1 puts the painting on the screen's left, so the reading panel goes
  // on the right, and vice versa.
  const onRight = side === -1
  const holeX = narrow ? '50%' : onRight ? '30%' : '70%'

  const sideHeight = `calc(100% - ${TOP} - ${String(BAR)}px)`
  const strip: CSSProperties = narrow
    ? { position: 'fixed', top: TOP, left: 0, right: 0, height: '34%', zIndex: 26 }
    : onRight
      ? { position: 'fixed', top: TOP, left: 0, width: '10%', height: sideHeight, zIndex: 26 }
      : { position: 'fixed', top: TOP, right: 0, width: '10%', height: sideHeight, zIndex: 26 }

  const panel: CSSProperties = {
    position: 'fixed',
    zIndex: 30,
    display: 'flex',
    alignItems: 'flex-start',
    overflowX: 'hidden',
    overflowY: 'auto',
    scrollbarWidth: 'none',
    // Slide in from the side the panel is pinned to, so it never flies across
    // the painting it is describing.
    animation: `${narrow ? 'panelInUp' : onRight ? 'panelIn' : 'panelInL'} .9s .5s cubic-bezier(.2,.8,.2,1) both`,
    ...(narrow
      ? {
          left: 0,
          right: 0,
          bottom: BAR,
          height: 'min(56%, 400px)',
          background: 'linear-gradient(to top, rgba(10,8,6,0), rgba(10,8,6,.95) 24%)',
        }
      : onRight
        ? {
            top: TOP,
            bottom: BAR,
            right: 0,
            width: 'min(460px, 44vw)',
            background: 'linear-gradient(to right, rgba(10,8,6,0), rgba(10,8,6,.95) 24%)',
          }
        : {
            top: TOP,
            bottom: BAR,
            left: 0,
            width: 'min(460px, 44vw)',
            background: 'linear-gradient(to left, rgba(10,8,6,0), rgba(10,8,6,.95) 24%)',
          }),
  }

  const name = title(art)

  return (
    <Dialog open onClose={onClose}>
      {(titleId) => (
        <>
          <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 24, pointerEvents: 'none', overflow: 'hidden', animation: 'worldIn 1.4s .35s ease both' }}>
            <div
              style={{
                position: 'absolute',
                inset: '-12%',
                width: '124%',
                height: '124%',
                backgroundImage: `url("${artworkSrc(art)}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(46px) saturate(1.3) brightness(.42)',
                // The legacy slow drift, so a held focus view is never static.
                // The global prefers-reduced-motion rule collapses it.
                animation: 'worldZoom 22s ease-in-out infinite alternate',
                willChange: 'transform',
                maskImage: `radial-gradient(ellipse 46% 70% at ${holeX} 46%, transparent 60%, #000 86%)`,
                WebkitMaskImage: `radial-gradient(ellipse 46% 70% at ${holeX} 46%, transparent 60%, #000 86%)`,
              }}
            />
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 46% 68% at ${holeX} 46%, transparent 58%, rgba(5,4,3,.85) 92%)` }} />
            <div
              style={{
                position: 'absolute',
                bottom: '6%',
                ...(onRight ? { left: '-1%' } : { right: '-1%' }),
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: narrow ? 78 : 170,
                lineHeight: 1,
                color: 'transparent',
                WebkitTextStroke: '1px rgba(239,231,216,.22)',
                whiteSpace: 'nowrap',
                animation: 'fadeInUp 1.4s .8s ease both',
              }}
            >
              {name}
            </div>
          </div>

          {/* First focusable, and deliberately outside [data-panel] so the
              arrow keys still step between paintings after it opens. */}
          <button type="button" onClick={onClose} aria-label={t.backToWalk} style={{ ...strip, cursor: 'pointer', background: 'none', border: 0 }} />

          <div data-panel style={panel}>
            <div style={{ position: 'relative', padding: narrow ? '26px 24px' : '40px 52px', width: '100%', boxSizing: 'border-box', marginBlock: 'auto' }}>
              {!narrow && (
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: -60,
                    ...(onRight ? { right: 20 } : { left: 20 }),
                    fontFamily: 'var(--font-display)',
                    fontSize: 220,
                    fontWeight: 700,
                    lineHeight: 1,
                    color: 'rgba(217,164,65,.08)',
                  }}
                >
                  {orderLabel(art.order)}
                </div>
              )}
              <div aria-hidden="true" style={{ width: 56, height: 3, background: 'linear-gradient(90deg, #d9a441, #ffe9b0)', marginBottom: 22, animation: 'fadeInUp .7s .15s ease both' }} />
              <p style={{ margin: '0 0 10px', fontSize: 13, color: '#d9a441', animation: 'fadeInUp .7s .25s ease both' }}>
                {orderLabel(art.order)} · <span style={{ letterSpacing: 2 }}>{captionMeta(art)}</span>
              </p>
              <h2
                id={titleId}
                style={{ margin: '0 0 20px', fontFamily: 'var(--font-display)', fontSize: narrow ? 32 : 52, fontWeight: 700, lineHeight: 1.25, animation: 'fadeInUp .7s .35s ease both' }}
              >
                {name}
              </h2>
              <p style={{ margin: '0 0 22px', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: narrow ? 16 : 19, lineHeight: 2, color: '#d8c9a4', animation: 'fadeInUp .7s .45s ease both' }}>
                « {note(art)} »
              </p>
              <p style={{ margin: '0 0 30px', fontSize: 13, color: '#8d7c58', animation: 'fadeInUp .7s .55s ease both' }}>
                {sizeLabel(art)} · {t.uniqueSigned}
              </p>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', animation: 'fadeInUp .7s .65s ease both' }}>
                <a
                  href={PORTFOLIO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, fontSize: 14, padding: '12px 26px', border: '1px solid #d9a441', color: '#d9a441' }}
                >
                  {t.askAbout}
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ minHeight: 44, font: 'inherit', fontSize: 14, padding: '12px 26px', background: 'none', border: '1px solid #4a3c22', color: '#cbbc98', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {t.backToWalk}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </Dialog>
  )
}
