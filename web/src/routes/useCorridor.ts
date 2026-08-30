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

/** How far back from a painting the camera parks when it is opened. */
const FOCUS_STANDOFF = 780

/** Matches the `transform 1.3s` on a painting frame, plus a little slack. */
const TRANSITION_MS = 1400

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
  registerPainting: (i: number) => Register<HTMLDivElement>
  registerGlow: (i: number) => Register<HTMLDivElement>
  registerBay: (key: string, z: number, stagger: boolean) => Register<HTMLDivElement>
  registerMirror: Register<HTMLDivElement>
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
  lastNum: number
}

interface Bay {
  el: HTMLElement
  z: number
  /** Repeating corridor bays reveal their children a few per frame. Only the
   *  memoised geometry may do this — React must never re-render those nodes
   *  while the engine owns their `visibility`. */
  stagger: boolean
}

export function useCorridor(ui: CorridorUi, handlers: CorridorHandlers): Corridor {
  const lookRef = useRef<HTMLDivElement | null>(null)
  const worldRef = useRef<HTMLDivElement | null>(null)
  const progressRef = useRef<HTMLDivElement | null>(null)
  const railRef = useRef<HTMLDivElement | null>(null)
  const counterRef = useRef<HTMLSpanElement | null>(null)

  const paintEls = useRef<(HTMLElement | null)[]>([])
  const glowEls = useRef<(HTMLElement | null)[]>([])
  const bays = useRef(new Map<string, Bay>())
  const bayOn = useRef(new Map<string, boolean>())
  const reveal = useRef<HTMLElement[]>([])
  const mirrorEl = useRef<HTMLElement | null>(null)
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
    lastNum: -1,
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

  const registerGlow = useCallback(
    (i: number): Register<HTMLDivElement> =>
      (el) => {
        glowEls.current[i] = el
      },
    [],
  )

  const registerBay = useCallback(
    (key: string, z: number, stagger: boolean): Register<HTMLDivElement> =>
      (el) => {
        if (el) {
          bays.current.set(key, { el, z, stagger })
        } else {
          bays.current.delete(key)
          bayOn.current.delete(key)
        }
      },
    [],
  )

  const registerMirror = useCallback<Register<HTMLDivElement>>((el) => {
    mirrorEl.current = el
    if (!el) m.current.lastMirror = -1
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
    s.needsPass = true
  }, [])

  const open = useCallback(
    (i: number) => {
      const idx = Math.max(0, Math.min(COUNT - 1, i))
      const side = idx % 2 === 0 ? -1 : 1
      const z = paintingZ(idx)
      const prev = latest.current.ui.focus
      if (prev != null && prev !== idx) settleTransition(prev)
      armTransition(idx)
      const s = m.current
      s.targetX = -side * 210
      s.target = -z - FOCUS_STANDOFF
      s.needsPass = true
      latest.current.handlers.onFocus(idx)
    },
    [armTransition, settleTransition],
  )

  const close = useCallback(() => {
    const f = latest.current.ui.focus
    if (f != null) settleTransition(f)
    const s = m.current
    s.targetX = 0
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
  }, [later, settleTransition])

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
    s.needsPass = true
    window.scrollTo({ top: 0 })
  }, [])

  useEffect(() => {
    const s = m.current
    motionQuery.current = window.matchMedia('(prefers-reduced-motion: reduce)')

    const writeWorld = () => {
      const el = worldRef.current
      if (el) el.style.transform = `translateX(${s.x.toFixed(1)}px) translateZ(${s.cam.toFixed(1)}px)`
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
      const narrow = window.innerWidth < 760
      if (narrow !== latest.current.ui.narrow) latest.current.handlers.onNarrow(narrow)
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
      s.tRy = (touch.clientX / window.innerWidth - 0.5) * -7
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
      // way the page reads (left-to-right).
      const rtl = false
      const forwardKey = rtl ? 'ArrowLeft' : 'ArrowRight'
      const backKey = rtl ? 'ArrowRight' : 'ArrowLeft'
      const fwd = e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === forwardKey
      const back = e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === backKey
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
        Math.abs(s.tRy - s.ry) > 0.006 ||
        Math.abs(s.tRx - s.rx) > 0.006
      )
      if (idle && !s.needsPass && reveal.current.length === 0) {
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
          s.ry = s.tRy
          s.rx = s.tRx
        } else {
          const ez = (b: number) => 1 - Math.pow(1 - b, dt / 16.7)
          s.cam += (s.target - s.cam) * ez(0.085)
          s.x += (s.targetX - s.x) * ez(0.075)
          s.ry += (s.tRy - s.ry) * ez(0.07)
          s.rx += (s.tRx - s.rx) * ez(0.07)
        }
        writeWorld()
        writeLook()
      }

      const pw = `${(Math.round(Math.max(0, Math.min(1, s.cam / CORRIDOR.DEPTH)) * 200) / 2).toFixed(1)}%`
      if (progressRef.current && s.lastPw !== pw) {
        s.lastPw = pw
        progressRef.current.style.width = pw
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

      for (let k = 0; k < COUNT; k++) {
        const el = paintEls.current[k]
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
          el.style.visibility = op === 0 ? 'hidden' : 'visible'
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

      for (const [key, bay] of bays.current) {
        const bd = bay.z + s.cam
        // `undefined` on the first pass, deliberately: comparing it against a
        // boolean below is what forces every bay to be written once, so a bay
        // that starts out of range is actually hidden instead of staying
        // rendered and keyboard-focusable at the entrance.
        const was = bayOn.current.get(key)
        // Hysteresis: a wider window to leave than to enter, so a bay sitting
        // exactly on the boundary does not strobe.
        const on = u.focus != null ? false : was === true ? bd > -3000 && bd < 1900 : bd > -2600 && bd < 1500
        if (was === on) continue
        bayOn.current.set(key, on)
        if (on) {
          if (bay.stagger) {
            for (const child of Array.from(bay.el.children)) {
              if (!(child instanceof HTMLElement)) continue
              child.style.visibility = 'hidden'
              reveal.current.push(child)
            }
          }
          bay.el.style.visibility = 'visible'
        } else {
          bay.el.style.visibility = 'hidden'
          if (reveal.current.length) {
            reveal.current = reveal.current.filter((c) => c.parentElement !== bay.el)
          }
        }
      }
      // One element per frame: revealing a whole bay at once is a paint spike
      // big enough to drop a frame on a mid-range phone.
      const next = reveal.current.shift()
      if (next) next.style.visibility = 'visible'

      if (mirrorEl.current) {
        const md = Math.abs(MIRROR_Z + s.cam)
        const mo = Math.round(Math.max(0, Math.min(1, (2500 - md) / 1700)) * 20) / 20
        if (s.lastMirror !== mo) {
          s.lastMirror = mo
          mirrorEl.current.style.opacity = String(mo)
        }
      }
    }
    raf.current = requestAnimationFrame(loop)

    const pending = timers.current
    const revealAtSetup = reveal.current
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
      revealAtSetup.length = 0
      bayOnAtSetup.clear()
    }
  }, [exitRoom, goTo, open, syncFromScroll])

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
      registerGlow,
      registerBay,
      registerMirror,
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
      registerGlow,
      registerBay,
      registerMirror,
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
