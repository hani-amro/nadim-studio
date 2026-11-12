/**
 * The museum camera.
 *
 * Everything that has to happen every frame — the world transform, the look
 * rotation, the per-painting fade, the bay culling, the HUD readout — is
 * written straight to element `.style`. None of it goes through React state:
 * a scroll-driven camera at 60fps would otherwise re-render the whole 3D tree
 * sixty times a second. React state in this route is only for the discrete
 * things (which painting is focused, which overlay is open, the breakpoint).
 *
 * The elements are collected through ref callbacks rather than
 * `document.querySelectorAll`. The previous build cached a NodeList inside the
 * rAF loop, which went stale the moment anything re-rendered and left the
 * engine animating detached nodes.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { CORRIDOR, COUNT, nearestIndex, paintingZ } from '../data/artworks'

/** Depth of the "the last painting is you" mirror. It is the one prop whose
 *  fade is driven by raw camera depth instead of a painting index. */
const MIRROR_Z = -12150

/** Depth of the gallery-map sign just inside the entrance. */
export const PLAQUE_Z = -1500
/** On a phone the sign fades out between these distances ahead of the
 *  camera — gone before the drift swings the camera across its path. */
const PLAQUE_FADE = { FROM: 750, TO: 300 } as const

/** How far back from a painting the camera parks when it is opened. */
const FOCUS_STANDOFF = 780

/** Matches the `transform 1.3s` on a painting frame, plus a little slack. */
const TRANSITION_MS = 1400

/** The scene's lens. Museum.tsx puts these on the world container; the
 *  narrow-screen framing below has to project through the same numbers. */
export const PERSPECTIVE = 1150
export const ORIGIN_Y = 0.46

/** Height of each letterbox bar (the HUD at the bottom). */
export const LETTERBOX = 52

/** Below this width the museum switches to its phone layout: the bottom info
 *  sheet, the drifting camera and the larger in-world type. */
export const NARROW_PX = 760

/** The phone info sheet: `min(FRAC of the screen, MAX px)` tall, sitting on
 *  the bottom letterbox. The focus framing has to know it to keep the
 *  painting clear of it. */
export const SHEET = { FRAC: 0.5, MAX: 360 } as const

/** The wordmark row hanging under the top letterbox (py-4 + one line). The
 *  framed painting starts below it, not behind it. */
const HEADER_PX = 60

/** A painting's gilt frame, from Museum.tsx: 620 wide, 496 tall, its centre
 *  96px above the painting element's anchor line. */
const FRAME_W = 620
const FRAME_H = 496
const FRAME_CY = -96
/** Where the paintings hang, either side of the carpet. */
const HANG_X = 470

/**
 * How far the camera drifts toward the wall on a phone.
 *
 * A portrait screen sees about 30 degrees of corridor where a desktop sees 64,
 * so with the camera on the carpet every painting is half off the screen as it
 * comes up. Shrinking the world until it fits would take the captions down to
 * three or four pixels. Instead the camera dollies toward each painting as it
 * approaches and across to the next one — the walk zig-zags wall to wall.
 */
const SWAY = 300
/** How far ahead a painting is when the drift peaks on it. */
const SWAY_LEAD = 900
/** Depth over which the drift eases in from the entrance. */
const SWAY_IN = 700

/**
 * The doorways off the corridor, as camera-depth windows.
 *
 * Both open in the left wall at x≈-880 — the study room at depth 5400, the
 * sculpture archway at 6820. A portrait screen never has that wall in view
 * while it is near them, so on a phone the HUD offers the door instead while
 * the camera is passing it.
 */
export type Door = 'study' | 'sculpture'
const DOORS: readonly { door: Door; from: number; to: number }[] = [
  { door: 'study', from: 4500, to: 6000 },
  { door: 'sculpture', from: 6000, to: 7600 },
]

/** The top of the corridor chrome in px: the taller of the letterbox and the
 *  demo notice, which is what `--museum-top` resolves to in CSS. */
export function museumTopPx(): number {
  const demo = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--demo-bar'))
  return Math.max(LETTERBOX, Number.isFinite(demo) ? demo : 0)
}

/** The clear window above the phone info sheet, in screen px. */
export function sheetWindow(w: number, h: number): { top: number; bottom: number; mid: number; width: number } {
  const top = museumTopPx() + HEADER_PX
  const bottom = h - LETTERBOX - Math.min(h * SHEET.FRAC, SHEET.MAX) - 12
  return { top, bottom, mid: (top + bottom) / 2, width: w - 24 }
}

/** Lateral camera offset for a phone at walk depth `cam` (world translateX). */
function walkSway(cam: number): number {
  const f = (cam + SWAY_LEAD - CORRIDOR.FIRST) / CORRIDOR.STEP
  const last = COUNT - 1
  // Painting 0 hangs on the left, so the world shifts right (+) to face it;
  // cos(πf) then swings the camera to the opposite wall for each next piece.
  // The first SWAY_IN of the walk eases out from the carpet, so the doors
  // open onto the same square view of the hall a desktop gets.
  if (f <= last) return SWAY * Math.cos(Math.PI * Math.max(0, f)) * smooth(cam / SWAY_IN)
  // Past the last painting the camera settles back onto the carpet, square to
  // the end wall, the mirror and the lectern.
  return SWAY * Math.cos(Math.PI * last) * (1 - smooth((f - last) / 0.6))
}

/** Smoothstep, clamped to 0..1. */
function smooth(t: number): number {
  const c = Math.max(0, Math.min(1, t))
  return c * c * (3 - 2 * c)
}

/** The discrete UI state the engine has to respect. */
export interface CorridorUi {
  focus: number | null
  room: boolean
  mapOpen: boolean
  gbOpen: boolean
  introVisible: boolean
  narrow: boolean
}

export interface CorridorHandlers {
  onFocus: (i: number | null) => void
  onRoom: (open: boolean) => void
  onNarrow: (narrow: boolean) => void
  /** The doorway the camera is passing on a phone, or null. Fired on change
   *  only, so it costs a render per doorway, not one per frame. */
  onDoor: (door: Door | null) => void
}

type Register<T extends HTMLElement> = (el: T | null) => void

export interface Corridor {
  /** Wraps the world and carries the look rotation + the mobile zoom-out. */
  lookRef: RefObject<HTMLDivElement | null>
  /** Carries the walk itself: translateX (side-step) + translateZ (depth). */
  worldRef: RefObject<HTMLDivElement | null>
  progressRef: RefObject<HTMLDivElement | null>
  railRef: RefObject<HTMLDivElement | null>
  counterRef: RefObject<HTMLSpanElement | null>
  /** The painting's group: carries its place in the hall and the 1.3s swing
   *  when it is opened. It has no opacity of its own. */
  registerPainting: (i: number) => Register<HTMLDivElement>
  /** The painting's one flat layer (frame, image, caption): the distance
   *  fade is written here, where it is a single texture's alpha. On the
   *  group it was an opacity over several 3D layers, which the GPU can only
   *  do by drawing the whole group to an offscreen surface first. */
  registerBody: (i: number) => Register<HTMLDivElement>
  registerGlow: (i: number) => Register<HTMLDivElement>
  registerBay: (key: string, z: number, options?: BayOptions) => Register<HTMLDivElement>
  registerMirror: Register<HTMLDivElement>
  registerPlaque: Register<HTMLDivElement>
  /** Park in front of painting `i` and report it as focused. */
  open: (i: number) => void
  /** Leave the focus panel and hand the camera back to the scroll position. */
  close: () => void
  enterRoom: () => void
  exitRoom: () => void
  /** Scroll (smoothly, unless motion is reduced) to painting `i`. */
  goTo: (i: number) => void
  /** Drop the camera behind the door and start the walk at zero. */
  beginWalk: () => void
  /** setTimeout that is tracked and cleared on unmount. */
  later: (fn: () => void, ms: number) => void
  reducedMotion: () => boolean
}

interface Motion {
  cam: number
  target: number
  x: number
  targetX: number
  /** Vertical lift, used only to frame an opened painting on a phone. */
  y: number
  targetY: number
  ry: number
  tRy: number
  rx: number
  tRx: number
  zoom: number
  scrollMax: number
  needsPass: boolean
  lastApply: number
  tPrev: number
  lastPw: string
  lastMirror: number
  lastPlaque: number
  lastNum: number
  lastDoor: Door | null
}

interface Bay {
  el: HTMLElement
  z: number
  /** Where the group stands sideways (the study room is 1750px off the
   *  carpet), so it can be born in the middle of the screen. */
  x: number
  /** Made `inert` while parked. See BayOptions.inertWhenParked. */
  inertWhenParked: boolean
}

export interface BayOptions {
  /** Where the group stands sideways, if it is not on the carpet. */
  x?: number
  /**
   * The group holds something a visitor can focus, press or read: a button,
   * a link, a line of text. A parked group is only moved out of sight, so
   * without `inert` its buttons stay in the tab order and its words stay in
   * the accessibility tree and in find-in-page. The corridor bays hold none
   * of that and are left alone: toggling `inert` on forty planes re-runs
   * style for all of them on the frame a bay returns.
   */
  inertWhenParked?: boolean
}

/**
 * Layers are born once and never destroyed.
 *
 * A browser decides how finely to rasterise a 3D layer the first time it
 * draws it at between a quarter of its size and its full size, and with
 * `will-change` it then keeps that scale for the life of the layer. A layer
 * that comes into view gradually passes through that band and lands on its
 * natural, small scale. A layer that first appears next to the camera skips
 * the band and is pinned at many times its size instead.
 *
 * The old engine culled with `visibility: hidden`, which destroys the layer:
 * every bay re-entered while walking backwards, and every bay when a painting
 * was closed, was created again beside the camera. One such frame measured
 * 1.9 seconds on an Intel UHD laptop.
 *
 * So each group is shown once, as it mounts behind the entrance doors,
 * BIRTH_AHEAD in front of the camera, where every plane of it is inside the
 * band. After that it is never hidden: out of range it is parked far below
 * the hall, off-screen and undrawn but alive, with its small texture scale
 * intact, and it comes back by having that offset removed.
 */
const BIRTH_FRAMES = 3
/** How far ahead of the camera a group is born. At this distance a plane laid
 *  out at 1/LOW appears at 0.5 to 0.9 of its box on a laptop and on a phone. */
const BIRTH_AHEAD = 5000
/** Where a group waits while it is out of range. */
export const PARKED = 'translate3d(0px, 1000000px, 0px)'

export function useCorridor(ui: CorridorUi, handlers: CorridorHandlers): Corridor {
  const lookRef = useRef<HTMLDivElement | null>(null)
  const worldRef = useRef<HTMLDivElement | null>(null)
  const progressRef = useRef<HTMLDivElement | null>(null)
  const railRef = useRef<HTMLDivElement | null>(null)
  const counterRef = useRef<HTMLSpanElement | null>(null)

  const paintEls = useRef<(HTMLElement | null)[]>([])
  const bodyEls = useRef<(HTMLElement | null)[]>([])
  const glowEls = useRef<(HTMLElement | null)[]>([])
  const bays = useRef(new Map<string, Bay>())
  const bayOn = useRef(new Map<string, boolean>())
  /** Bays still being born, and the frames each has left. */
  const birth = useRef(new Map<string, number>())
  const mirrorEl = useRef<HTMLElement | null>(null)
  const plaqueEl = useRef<HTMLElement | null>(null)
  const lastOp = useRef<number[]>([])
  const lastGlow = useRef<number[]>([])

  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())
  const runSeq = useRef(0)
  const settleRun = useRef<number[]>([])
  const raf = useRef(0)
  const motionQuery = useRef<MediaQueryList | null>(null)

  const m = useRef<Motion>({
    cam: 0,
    target: 0,
    x: 0,
    targetX: 0,
    y: 0,
    targetY: 0,
    ry: 0,
    tRy: 0,
    rx: 0,
    tRx: 0,
    zoom: 1,
    scrollMax: 1,
    needsPass: true,
    lastApply: 0,
    tPrev: 0,
    lastPw: '',
    lastMirror: -1,
    lastPlaque: -1,
    lastNum: -1,
    lastDoor: null,
  })

  // Handlers and UI read by listeners that are registered once. Updated in a
  // layout effect (not during render) so nothing is mutated mid-render.
  const latest = useRef({ ui, handlers })
  useLayoutEffect(() => {
    const prev = latest.current.ui
    latest.current = { ui, handlers }
    const changed =
      prev.focus !== ui.focus ||
      prev.room !== ui.room ||
      prev.mapOpen !== ui.mapOpen ||
      prev.gbOpen !== ui.gbOpen ||
      prev.introVisible !== ui.introVisible ||
      prev.narrow !== ui.narrow
    if (changed) {
      m.current.needsPass = true
    }
  })

  const reducedMotion = useCallback(() => motionQuery.current?.matches === true, [])

  // Read straight off the window, not from `ui.narrow`: that one only updates
  // after React commits, and the listeners need the answer in the same event.
  const narrowNow = useCallback(() => window.innerWidth < NARROW_PX, [])

  /** Where the camera stands sideways while walking (not focused, not in the
   *  study room). */
  const walkX = useCallback((cam: number) => (narrowNow() ? walkSway(cam) : 0), [narrowNow])

  /**
   * Camera pose that shows painting `i`.
   *
   * Desktop keeps the original move: step 210px toward the wall and stop 780px
   * back, leaving the far half of the screen for the side panel. On a phone the
   * info sheet takes the bottom of the screen, so the painting is centred in
   * the window above it — the camera stands square in front of it, at whatever
   * distance makes the frame fill that window, lifted so it sits in the middle.
   */
  const focusPose = useCallback(
    (i: number): { x: number; y: number; cam: number } => {
      const side = i % 2 === 0 ? -1 : 1
      const z = paintingZ(i)
      if (!narrowNow()) return { x: -side * 210, y: 0, cam: -z - FOCUS_STANDOFF }

      const w = window.innerWidth
      const h = window.innerHeight
      const zoom = m.current.zoom
      const win = sheetWindow(w, h)
      // k is the perspective scale p / (p - z) the frame needs to fill the
      // window; capped so a tall phone never pulls it nearer than the lens.
      const k = Math.max(
        0.25,
        Math.min(1.4, win.width / (FRAME_W * zoom), (win.bottom - win.top) / (FRAME_H * zoom)),
      )
      const standoff = PERSPECTIVE / k - PERSPECTIVE
      // Solve screenY = originY + (centreOffset + (FRAME_CY + y) * zoom) * k
      // for the world lift y that lands the frame's centre on win.mid.
      const y = ((win.mid - ORIGIN_Y * h) / k - (0.5 - ORIGIN_Y) * h) / zoom - FRAME_CY
      return { x: -side * HANG_X, y, cam: -z - standoff }
    },
    [narrowNow],
  )

  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id)
      fn()
    }, ms)
    timers.current.add(id)
  }, [])

  const registerPainting = useCallback(
    (i: number): Register<HTMLDivElement> =>
      (el) => {
        paintEls.current[i] = el
      },
    [],
  )

  const registerBody = useCallback(
    (i: number): Register<HTMLDivElement> =>
      (el) => {
        bodyEls.current[i] = el
        // A fresh node has no fade written on it yet: forget the last value
        // so the next pass writes it rather than assuming it is in place.
        if (el) {
          lastOp.current[i] = -1
          m.current.needsPass = true
        }
      },
    [],
  )

  const registerGlow = useCallback(
    (i: number): Register<HTMLDivElement> =>
      (el) => {
        glowEls.current[i] = el
        if (el) {
          lastGlow.current[i] = -1
          m.current.needsPass = true
        }
      },
    [],
  )

  const registerBay = useCallback(
    (key: string, z: number, options: BayOptions = {}): Register<HTMLDivElement> =>
      (el) => {
        const x = options.x ?? 0
        if (el) {
          bays.current.set(key, { el, z, x, inertWhenParked: options.inertWhenParked === true })
          // Born here, before the first paint, straight ahead of the camera
          // wherever it stands (see BIRTH_FRAMES).
          const s = m.current
          el.style.transform = `translate3d(${(-x - s.x).toFixed(0)}px, ${(-s.y).toFixed(0)}px, ${(-z - s.cam - BIRTH_AHEAD).toFixed(0)}px)`
          birth.current.set(key, BIRTH_FRAMES)
          s.needsPass = true
        } else {
          bays.current.delete(key)
          bayOn.current.delete(key)
          birth.current.delete(key)
        }
      },
    [],
  )

  const registerMirror = useCallback<Register<HTMLDivElement>>((el) => {
    mirrorEl.current = el
    if (!el) m.current.lastMirror = -1
  }, [])

  const registerPlaque = useCallback<Register<HTMLDivElement>>((el) => {
    plaqueEl.current = el
    if (!el) m.current.lastPlaque = -1
  }, [])

  /** Put the 1.3s transition on painting `i` before React swaps its transform. */
  const armTransition = useCallback(
    (i: number) => {
      // Bumping the run stamp cancels any settle timer still pending for this
      // frame, so re-opening a painting mid-close cannot strip its transition
      // half way through the animation.
      settleRun.current[i] = ++runSeq.current
      const el = paintEls.current[i]
      if (!el) return
      el.style.transition = reducedMotion() ? '' : 'transform 1.3s cubic-bezier(.25,.8,.25,1)'
    },
    [reducedMotion],
  )

  /** Let painting `i` animate home, then take the transition back off. */
  const settleTransition = useCallback(
    (i: number) => {
      if (!paintEls.current[i]) return
      const run = ++runSeq.current
      settleRun.current[i] = run
      later(() => {
        // Re-opened in the meantime: that open owns the transition now.
        if (settleRun.current[i] !== run) return
        const el = paintEls.current[i]
        if (el) el.style.transition = ''
      }, TRANSITION_MS)
    },
    [later],
  )

  const syncFromScroll = useCallback(() => {
    const s = m.current
    // Recomputed here rather than cached at mount: the document height changes
    // with the viewport, and a stale scrollMax skews the whole walk.
    s.scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
    s.target = (window.scrollY / s.scrollMax) * CORRIDOR.DEPTH
    s.targetX = walkX(s.target)
    s.needsPass = true
  }, [walkX])

  const open = useCallback(
    (i: number) => {
      const idx = Math.max(0, Math.min(COUNT - 1, i))
      const prev = latest.current.ui.focus
      if (prev != null && prev !== idx) settleTransition(prev)
      armTransition(idx)
      const s = m.current
      const pose = focusPose(idx)
      s.targetX = pose.x
      s.targetY = pose.y
      s.target = pose.cam
      s.needsPass = true
      latest.current.handlers.onFocus(idx)
    },
    [armTransition, settleTransition, focusPose],
  )

  const close = useCallback(() => {
    const f = latest.current.ui.focus
    if (f != null) settleTransition(f)
    const s = m.current
    s.targetX = walkX(s.target)
    s.targetY = 0
    s.needsPass = true
    latest.current.handlers.onFocus(null)
    // The scrollbar has to be snapped to wherever the camera actually parked,
    // or letting go of the focus panel teleports the visitor back down the
    // hall. It cannot happen here: the <Dialog> still has the document's
    // overflow pinned, which clamps window.scrollTo to zero, and releasing it
    // can itself emit a scroll event. So park the depth and the scrollbar
    // together on the next task, after the dialog has unmounted.
    const parked = s.target
    later(() => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      s.target = parked
      s.needsPass = true
      window.scrollTo({ top: (parked / CORRIDOR.DEPTH) * max })
    }, 0)
  }, [later, settleTransition, walkX])

  const enterRoom = useCallback(() => {
    const u = latest.current.ui
    if (u.focus != null || u.room) return
    const s = m.current
    s.targetX = 1750
    s.target = 5050
    s.needsPass = true
    latest.current.handlers.onRoom(true)
  }, [])

  const exitRoom = useCallback(() => {
    const s = m.current
    s.targetX = 0
    s.needsPass = true
    latest.current.handlers.onRoom(false)
    // onScroll would refuse to run right now — its guard still sees room=true
    // until React commits — so resync the depth straight from the scroll
    // position instead of relying on the ordering of a state update.
    syncFromScroll()
  }, [syncFromScroll])

  const goTo = useCallback((i: number) => {
    const idx = Math.max(0, Math.min(COUNT - 1, i))
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
    window.scrollTo({
      top: ((CORRIDOR.FIRST + idx * CORRIDOR.STEP) / CORRIDOR.DEPTH) * max,
      behavior: motionQuery.current?.matches === true ? 'auto' : 'smooth',
    })
  }, [])

  const beginWalk = useCallback(() => {
    const s = m.current
    s.cam = -950
    s.target = 0
    s.targetX = walkX(0)
    s.needsPass = true
    window.scrollTo({ top: 0 })
  }, [walkX])

  useEffect(() => {
    const s = m.current
    motionQuery.current = window.matchMedia('(prefers-reduced-motion: reduce)')

    const writeWorld = () => {
      const el = worldRef.current
      if (el) {
        el.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, ${s.cam.toFixed(1)}px)`
      }
    }
    const writeLook = () => {
      const el = lookRef.current
      if (el) {
        el.style.transform = `rotateY(${s.ry.toFixed(2)}deg) rotateX(${s.rx.toFixed(2)}deg) scale(${s.zoom.toFixed(3)})`
      }
    }

    const onScroll = () => {
      const u = latest.current.ui
      // An open overlay owns the reader's attention; if the corridor keeps
      // walking behind it, closing the overlay drops them somewhere else.
      if (u.focus != null || u.room || u.mapOpen || u.gbOpen) return
      syncFromScroll()
    }

    const applyViewport = () => {
      s.scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      // The old floor was 0.42, which on a 390px phone rendered the painting
      // captions at three to five CSS pixels. 0.62 keeps them readable.
      s.zoom = Math.min(1, Math.max(0.62, window.innerWidth / 1250))
      writeLook()
      s.needsPass = true
      const narrow = narrowNow()
      const u = latest.current.ui
      // A phone turned sideways (or a window dragged narrower) changes the
      // framing: re-aim at the open painting, or at the walk's drift line.
      if (u.focus != null) {
        const pose = focusPose(u.focus)
        s.targetX = pose.x
        s.targetY = pose.y
        s.target = pose.cam
      } else if (!u.room) {
        s.targetX = walkX(s.target)
      }
      if (narrow !== u.narrow) latest.current.handlers.onNarrow(narrow)
    }

    /** True whenever the scene must hold still: an overlay is up, or the
     *  visitor asked for reduced motion. */
    const parallaxBlocked = () => {
      const u = latest.current.ui
      return u.focus != null || u.mapOpen || u.gbOpen || u.introVisible || motionQuery.current?.matches === true
    }

    const onPointerMove = (e: PointerEvent) => {
      // The same guard touchmove already had. Without it, moving the pointer
      // swung the whole corridor around behind the open info panel.
      if (parallaxBlocked()) return
      s.tRy = (e.clientX / window.innerWidth - 0.5) * -7
      s.tRx = (e.clientY / window.innerHeight - 0.5) * 4
    }

    const onTouchMove = (e: TouchEvent) => {
      if (parallaxBlocked()) return
      const touch = e.touches[0]
      if (!touch) return
      // On a phone the swipe that walks is also the touch read here, so the
      // thumb's side of the screen would swing the corridor on every scroll.
      // ±3.5° is an eighth of a portrait screen's field of view; keep a hint.
      const reach = narrowNow() ? -2.4 : -7
      s.tRy = (touch.clientX / window.innerWidth - 0.5) * reach
    }

    // iOS 13+ only delivers this after an explicit permission grant behind a
    // user gesture, so on iPhone the listener is simply inert — no prompt is
    // asked for, and navigation never depends on tilt. It does work on Android
    // and on desktops with a sensor, so it is registered anyway.
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null || parallaxBlocked()) return
      s.tRy = Math.max(-9, Math.min(9, -e.gamma * 0.28))
      s.tRx = Math.max(-5, Math.min(5, (e.beta - 45) * 0.1))
    }

    const onKey = (e: KeyboardEvent) => {
      const u = latest.current.ui

      if (e.key === 'Escape') {
        // The map, the guest book, the focus panel and the intro are all
        // <Dialog>s and answer Escape themselves. Only the study room — which
        // is a camera position, not an overlay — needs handling here.
        if (u.introVisible || u.mapOpen || u.gbOpen || u.focus != null) return
        if (u.room) exitRoom()
        return
      }

      if (u.gbOpen || u.introVisible || u.room || u.mapOpen) return

      const target = e.target instanceof Element ? e.target : null
      // Never hijack the arrows while the visitor is typing or reading inside
      // the scrollable info panel: those keys are moving their caret or the
      // panel's own scroll position.
      if (target?.closest('input, textarea, select, [contenteditable="true"], [data-panel]')) return

      if (e.key === 'Enter') {
        if (u.focus != null) return
        // A real control activates itself; do not open a second painting.
        if (target?.closest('button, a[href]')) return
        e.preventDefault()
        open(nearestIndex(s.cam))
        return
      }

      // Forward is "further into the page": down, and the key that points the
      // way the page reads. The site is left-to-right only, so that is
      // ArrowRight — the `const rtl = false` switch this used to branch on
      // could take one arm and nothing else.
      const fwd = e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'ArrowRight'
      const back = e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'ArrowLeft'
      if (!fwd && !back) return

      e.preventDefault()
      if (u.focus != null) {
        const next = Math.max(0, Math.min(COUNT - 1, u.focus + (fwd ? 1 : -1)))
        if (next !== u.focus) open(next)
      } else {
        goTo(nearestIndex(s.cam) + (fwd ? 1 : -1))
      }
    }

    applyViewport()
    syncFromScroll()
    writeWorld()

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', applyViewport)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('deviceorientation', onTilt)
    window.addEventListener('keydown', onKey)

    const loop = (now: number) => {
      raf.current = requestAnimationFrame(loop)
      const u = latest.current.ui
      const idle = !(
        Math.abs(s.target - s.cam) > 0.3 ||
        Math.abs(s.targetX - s.x) > 0.3 ||
        Math.abs(s.targetY - s.y) > 0.3 ||
        Math.abs(s.tRy - s.ry) > 0.006 ||
        Math.abs(s.tRx - s.rx) > 0.006
      )
      if (idle && !s.needsPass && birth.current.size === 0) {
        s.tPrev = now
        return
      }
      // The old throttle was `now - last < 21`. On a 60Hz display every second
      // frame lands inside that window, so the walk ran at a hard 30fps. 8ms
      // lets every real frame through and still collapses bursts on 120Hz.
      if (now - s.lastApply < 8) return

      const dt = Math.min(66, now - (s.tPrev || now))
      s.tPrev = now
      s.lastApply = now
      s.needsPass = false

      if (!idle) {
        if (motionQuery.current?.matches === true) {
          // No easing when motion is reduced: the camera arrives, it does not
          // glide. The CSS-level rule in index.css cannot reach a rAF loop.
          s.cam = s.target
          s.x = s.targetX
          s.y = s.targetY
          s.ry = s.tRy
          s.rx = s.tRx
        } else {
          const ez = (b: number) => 1 - Math.pow(1 - b, dt / 16.7)
          s.cam += (s.target - s.cam) * ez(0.085)
          s.x += (s.targetX - s.x) * ez(0.075)
          s.y += (s.targetY - s.y) * ez(0.075)
          s.ry += (s.tRy - s.ry) * ez(0.07)
          s.rx += (s.tRx - s.rx) * ez(0.07)
        }
        writeWorld()
        writeLook()
      }

      // scaleX, not width: a width change is a layout and a repaint of the
      // HUD on most frames of the walk; a transform is neither.
      const pw = (Math.round(Math.max(0, Math.min(1, s.cam / CORRIDOR.DEPTH)) * 200) / 200).toFixed(3)
      if (progressRef.current && s.lastPw !== pw) {
        s.lastPw = pw
        progressRef.current.style.transform = `scaleX(${pw})`
      }

      // The HUD counter and the Enter key both resolve "which painting am I
      // at" through nearestIndex(). The old build ran the counter off an
      // offset of 900 and the keyboard off 1100, so the number on screen could
      // name a different painting than the one Enter would open.
      const n = (u.focus ?? nearestIndex(s.cam)) + 1
      if (s.lastNum !== n) {
        s.lastNum = n
        if (counterRef.current) {
          counterRef.current.textContent = `${n} / ${COUNT}`
        }
        railRef.current?.setAttribute('aria-valuenow', String(n))
      }

      let door: Door | null = null
      if (narrowNow() && u.focus == null && !u.room && !u.introVisible) {
        door = DOORS.find((d) => s.cam >= d.from && s.cam < d.to)?.door ?? null
      }
      if (door !== s.lastDoor) {
        s.lastDoor = door
        latest.current.handlers.onDoor(door)
      }

      for (let k = 0; k < COUNT; k++) {
        const el = bodyEls.current[k]
        if (!el) continue
        let op: number
        if (u.focus != null) {
          op = k === u.focus ? 1 : 0
        } else {
          const d = Math.abs(paintingZ(k) + s.cam)
          op = Math.round(Math.max(0, Math.min(1, 1.25 - d / 3200)) * 20) / 20
        }
        if (lastOp.current[k] !== op) {
          lastOp.current[k] = op
          el.style.opacity = String(op)
          // Faded out, not hidden: hiding would destroy the layer, and a
          // painting met again from behind would be redrawn at many times
          // its size. `inert` keeps its button unreachable while it is gone.
          el.inert = op === 0
        }
        const glow = glowEls.current[k]
        if (!glow) continue
        const gd = Math.abs(paintingZ(k) + s.cam)
        const gv = u.focus != null ? 0 : Math.round(Math.max(0, 1 - gd / 1500) * 20) / 20
        if (lastGlow.current[k] !== gv) {
          lastGlow.current[k] = gv
          glow.style.opacity = String(gv)
        }
      }

      for (const [key, left] of birth.current) {
        if (left > 0) birth.current.set(key, left - 1)
        else birth.current.delete(key)
      }
      for (const [key, bay] of bays.current) {
        // Still being born: it stays ahead of the camera until it has been
        // drawn there, and only then joins the culling below.
        if (birth.current.has(key)) continue
        const bd = bay.z + s.cam
        // `undefined` on the first pass, deliberately: comparing it against a
        // boolean below is what forces every bay to be written once, so a bay
        // that starts out of range is actually parked instead of staying
        // rendered and keyboard-focusable at the entrance.
        const was = bayOn.current.get(key)
        // Hysteresis: a wider window to leave than to enter, so a bay sitting
        // exactly on the boundary does not strobe.
        const on = u.focus != null ? false : was === true ? bd > -3000 && bd < 1900 : bd > -2600 && bd < 1500
        if (was === on) continue
        bayOn.current.set(key, on)
        // Parked, not hidden: `visibility: hidden` would destroy the layers.
        bay.el.style.transform = on ? '' : PARKED
        // `inert` is what keeps a parked doorway out of the tab order.
        if (bay.inertWhenParked) bay.el.inert = !on
      }

      if (mirrorEl.current) {
        const md = Math.abs(MIRROR_Z + s.cam)
        const mo = Math.round(Math.max(0, Math.min(1, (2500 - md) / 1700)) * 20) / 20
        if (s.lastMirror !== mo) {
          s.lastMirror = mo
          mirrorEl.current.style.opacity = String(mo)
        }
      }

      if (plaqueEl.current) {
        // Desktop keeps the sign solid: the camera stays on the carpet there
        // and it leaves the frame on its own.
        const ahead = -(PLAQUE_Z + s.cam)
        const po = narrowNow()
          ? Math.round(smooth((ahead - PLAQUE_FADE.TO) / (PLAQUE_FADE.FROM - PLAQUE_FADE.TO)) * 20) / 20
          : 1
        if (s.lastPlaque !== po) {
          s.lastPlaque = po
          plaqueEl.current.style.opacity = String(po)
          // Invisible must also mean untappable and out of the tab order.
          plaqueEl.current.style.visibility = po === 0 ? 'hidden' : ''
        }
      }
    }
    raf.current = requestAnimationFrame(loop)

    const pending = timers.current
    const birthAtSetup = birth.current
    const bayOnAtSetup = bayOn.current

    return () => {
      cancelAnimationFrame(raf.current)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', applyViewport)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('deviceorientation', onTilt)
      window.removeEventListener('keydown', onKey)
      // Every pending settle timer, or they fire into an unmounted tree.
      pending.forEach((id) => clearTimeout(id))
      pending.clear()
      // Captured above, not read off the ref here: by cleanup time the ref may
      // already point at a different object than the effect was working with.
      birthAtSetup.clear()
      bayOnAtSetup.clear()
    }
  }, [exitRoom, goTo, open, syncFromScroll, narrowNow, focusPose, walkX])

  // Every member is stable, so the handle itself is memoised too: callers put
  // it in dependency arrays, and a fresh object each render would defeat them.
  return useMemo(
    () => ({
      lookRef,
      worldRef,
      progressRef,
      railRef,
      counterRef,
      registerPainting,
      registerBody,
      registerGlow,
      registerBay,
      registerMirror,
      registerPlaque,
      open,
      close,
      enterRoom,
      exitRoom,
      goTo,
      beginWalk,
      later,
      reducedMotion,
    }),
    [
      registerPainting,
      registerBody,
      registerGlow,
      registerBay,
      registerMirror,
      registerPlaque,
      open,
      close,
      enterRoom,
      exitRoom,
      goTo,
      beginWalk,
      later,
      reducedMotion,
    ],
  )
}
