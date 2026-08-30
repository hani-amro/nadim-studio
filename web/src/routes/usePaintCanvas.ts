/**
 * The visitor's own painting: a full-page canvas that takes a stain wherever
 * they click or drag.
 *
 * Ported from the legacy gallery's DCLogic component. Every defensive measure
 * that was already there is kept, because each one came from a real failure:
 * a right-click that started a stroke nothing ever ended, a cancelled gesture
 * that left the brush stuck down, a resize that silently wiped the painting,
 * and a corrupt store that reached the 2D context unchecked.
 */

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { NoticeCode } from '../components/Notice'

const STORE_KEY = 'gallery-stains-v1'

/** The legacy build exposed this as an editable prop; these were its defaults. */
const PALETTE = ['#d43d2a', '#2b50c8', '#d9a441', '#1f7a6d', '#c2427e'] as const

/** Past this many ops a save grows large enough to hit the storage quota, so
 *  the oldest are dropped — visibly, never quietly. */
const MAX_OPS = 1200
const KEEP_OPS = 1000
const SAVE_DEBOUNCE_MS = 400
/** A drag only lays down a new stroke segment after this much travel. */
const MOVE_MIN_PX = 14
/** devicePixelRatio above 2 buys nothing here and costs a lot of memory. */
const MAX_DPR = 2

type PointKind = 'b' | 'p' | 'i'

/** b = thick oil blob, p = spray, i = ink bleed. */
interface PointOp {
  k: PointKind
  x: number
  y: number
  c: string
  r: number
  /** Seed for the deterministic rng, so a replay redraws the identical stain. */
  sd: number
}

/** s = one segment of a brush stroke. */
interface StrokeOp {
  k: 's'
  x1: number
  y1: number
  x2: number
  y2: number
  c: string
  r: number
  sd: number
}

type Op = PointOp | StrokeOp

/** mulberry32 — small, fast and reproducible from a seed, which is what lets a
 *  stain redraw identically every time the canvas is resized and replayed. */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function newSeed(): number {
  return (Math.random() * 1e9) | 0
}

function draw(ctx: CanvasRenderingContext2D, op: Op): void {
  const rnd = rng(op.sd || 1)
  ctx.save()
  if (op.k === 'b') {
    ctx.fillStyle = op.c
    ctx.globalAlpha = 0.92
    for (let i = 0; i < 6; i++) {
      const a = rnd() * Math.PI * 2
      const d = rnd() * op.r * 0.45
      ctx.beginPath()
      ctx.ellipse(
        op.x + Math.cos(a) * d,
        op.y + Math.sin(a) * d,
        op.r * (0.4 + rnd() * 0.5),
        op.r * (0.3 + rnd() * 0.45),
        rnd() * Math.PI,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    }
    for (let i = 0; i < 7; i++) {
      const a = rnd() * Math.PI * 2
      const d = op.r * (0.9 + rnd() * 1.6)
      ctx.beginPath()
      ctx.arc(op.x + Math.cos(a) * d, op.y + Math.sin(a) * d, 1.5 + rnd() * 4, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (op.k === 'p') {
    ctx.fillStyle = op.c
    for (let i = 0; i < 60; i++) {
      const a = rnd() * Math.PI * 2
      const d = (rnd() + rnd()) * 0.5 * op.r * 2.2
      ctx.globalAlpha = 0.25 + rnd() * 0.6
      ctx.beginPath()
      ctx.arc(op.x + Math.cos(a) * d, op.y + Math.sin(a) * d, 0.6 + rnd() * 2.6, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (op.k === 'i') {
    for (let i = 4; i >= 1; i--) {
      ctx.globalAlpha = 0.1 + (4 - i) * 0.07
      ctx.fillStyle = op.c
      ctx.beginPath()
      ctx.arc(op.x + (rnd() - 0.5) * 8, op.y + (rnd() - 0.5) * 8, op.r * (0.5 + i * 0.28), 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (op.k === 's') {
    ctx.strokeStyle = op.c
    ctx.lineCap = 'round'
    ctx.globalAlpha = 0.85
    for (let i = 0; i < 3; i++) {
      ctx.lineWidth = op.r * (0.35 + rnd() * 0.6)
      const ox = (rnd() - 0.5) * op.r * 0.7
      const oy = (rnd() - 0.5) * op.r * 0.7
      ctx.beginPath()
      ctx.moveTo(op.x1 + ox, op.y1 + oy)
      ctx.lineTo(op.x2 + ox, op.y2 + oy)
      ctx.stroke()
    }
    if (rnd() > 0.6) {
      ctx.globalAlpha = 0.7
      ctx.beginPath()
      ctx.arc(op.x2 + (rnd() - 0.5) * 30, op.y2 + (rnd() - 0.5) * 30, 1.5 + rnd() * 3, 0, Math.PI * 2)
      ctx.fillStyle = op.c
      ctx.fill()
    }
  }
  ctx.restore()
}

const HEX = /^#[0-9a-f]{3,8}$/i

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

/**
 * Anything read back from localStorage is untrusted input — it can be stale,
 * hand-edited, or written by a different version of this page. Nothing reaches
 * the 2D context before it has been proven to be an op.
 */
function parseOp(raw: unknown): Op | null {
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>
  const c = o.c
  const r = o.r
  if (typeof c !== 'string' || !HEX.test(c)) return null
  if (!isNum(r) || r <= 0 || r >= 400) return null
  const sd = isNum(o.sd) ? o.sd : 1
  if (o.k === 's') {
    const x1 = o.x1
    const y1 = o.y1
    const x2 = o.x2
    const y2 = o.y2
    if (!isNum(x1) || !isNum(y1) || !isNum(x2) || !isNum(y2)) return null
    return { k: 's', x1, y1, x2, y2, c, r, sd }
  }
  if (o.k === 'b' || o.k === 'p' || o.k === 'i') {
    const x = o.x
    const y = o.y
    if (!isNum(x) || !isNum(y)) return null
    return { k: o.k, x, y, c, r, sd }
  }
  return null
}

function loadOps(): { ops: Op[]; problem: NoticeCode | null } {
  let raw: string | null
  try {
    raw = localStorage.getItem(STORE_KEY)
  } catch {
    return { ops: [], problem: 'blocked' }
  }
  if (!raw) return { ops: [], problem: null }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ops: [], problem: 'corrupt' }
  }
  if (!Array.isArray(parsed)) return { ops: [], problem: 'corrupt' }

  const ops: Op[] = []
  for (const item of parsed) {
    const op = parseOp(item)
    if (op) ops.push(op)
  }
  // Dropping ops without saying so would read as the painting half-vanishing.
  return { ops, problem: ops.length === parsed.length ? null : 'corrupt' }
}

export interface PaintCanvas {
  /** Attach to the absolutely positioned, page-sized layer that hosts the canvas. */
  layerRef: RefObject<HTMLDivElement | null>
  notice: NoticeCode | null
  dismissNotice: () => void
  /** Wipe the painting and forget it. */
  clear: () => void
  /** A handful of stains across the current viewport — the welcome splash. */
  splash: () => void
}

/**
 * @param active while false (the intro overlay is up) pointer input is ignored,
 *        so the click that dismisses the overlay does not also paint under it.
 */
export function usePaintCanvas(active: boolean): PaintCanvas {
  const layerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const opsRef = useRef<Op[]>([])
  const colorIdxRef = useRef(0)
  const downRef = useRef(false)
  const lastRef = useRef<readonly [number, number] | null>(null)
  const saveTimerRef = useRef<number | undefined>(undefined)
  const activeRef = useRef(active)

  const [notice, setNotice] = useState<NoticeCode | null>(null)
  const dismissNotice = useCallback(() => setNotice(null), [])

  useEffect(() => {
    activeRef.current = active
    // Releasing the brush here matters: the intro closes on a pointerdown whose
    // matching pointerup may never reach us.
    if (!active) {
      downRef.current = false
      lastRef.current = null
    }
  }, [active])

  const runSave = useCallback(() => {
    saveTimerRef.current = undefined
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(opsRef.current))
      // A write that finally lands retires a storage warning; any other notice
      // (corrupt, trimmed) is left alone, because it is still true.
      setNotice((prev) => (prev === 'blocked' || prev === 'quota' ? null : prev))
    } catch (err) {
      setNotice(err instanceof Error && err.name === 'QuotaExceededError' ? 'quota' : 'blocked')
    }
  }, [])

  const scheduleSave = useCallback(() => {
    window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(runSave, SAVE_DEBOUNCE_MS)
  }, [runSave])

  const addOp = useCallback(
    (op: Op) => {
      const ctx = ctxRef.current
      if (!ctx) return
      opsRef.current.push(op)
      if (opsRef.current.length > MAX_OPS) {
        opsRef.current = opsRef.current.slice(-KEEP_OPS)
        setNotice('trimmed')
      }
      draw(ctx, op)
      scheduleSave()
    },
    [scheduleSave],
  )

  const nextColor = useCallback(() => {
    const i = colorIdxRef.current++ % PALETTE.length
    return PALETTE[i] ?? PALETTE[0]
  }, [])

  const stamp = useCallback(
    (x: number, y: number) => {
      const kinds: readonly PointKind[] = ['b', 'p', 'i']
      const k = kinds[(Math.random() * kinds.length) | 0] ?? 'b'
      addOp({ k, x, y, c: nextColor(), r: 18 + Math.random() * 34, sd: newSeed() })
    },
    [addOp, nextColor],
  )

  const splash = useCallback(() => {
    // stamp() works in PAGE coordinates, so offset by the current scroll.
    const w = document.documentElement.clientWidth
    const h = window.innerHeight
    const sx = window.scrollX
    const sy = window.scrollY
    for (let i = 0; i < 5; i++) {
      stamp(sx + w * (0.2 + Math.random() * 0.6), sy + h * (0.15 + Math.random() * 0.5))
    }
  }, [stamp])

  const sizeAndReplay = useCallback(() => {
    const cv = canvasRef.current
    const ctx = ctxRef.current
    if (!cv || !ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    const h = Math.max(document.documentElement.scrollHeight, window.innerHeight)
    const w = document.documentElement.clientWidth
    const bw = Math.round(w * dpr)
    const bh = Math.round(h * dpr)
    if (cv.width === bw && cv.height === bh) return
    // Assigning width/height also CLEARS the canvas, so every resize replays.
    cv.width = bw
    cv.height = bh
    cv.style.height = `${h}px`
    // Draw in CSS pixels; the backing store carries the extra device pixels.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    for (const op of opsRef.current) draw(ctx, op)
  }, [])

  const clear = useCallback(() => {
    opsRef.current = []
    colorIdxRef.current = 0
    window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = undefined
    try {
      localStorage.removeItem(STORE_KEY)
    } catch {
      // Gone from the screen but still in the store, so it would come back on
      // the next visit — the visitor has to be told the wipe did not stick.
      setNotice('blocked')
    }
    const cv = canvasRef.current
    const ctx = ctxRef.current
    if (cv && ctx) ctx.clearRect(0, 0, cv.width, cv.height)
  }, [])

  useEffect(() => {
    const host = layerRef.current
    if (!host) {
      setNotice('canvas')
      return
    }
    const cv = document.createElement('canvas')
    // The layer is pointer-events:none, so this never steals a scroll; it stops
    // browsers that hit-test the canvas mid-pan from claiming the gesture.
    cv.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;touch-action:none'
    const ctx = cv.getContext('2d')
    if (!ctx) {
      // Same deliberate case as the sculpture route: a 2D context that the
      // browser refused to create is an external-system failure discovered
      // inside the effect, and the visitor must be told rather than left with
      // a canvas that silently never paints.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotice('canvas')
      return
    }
    host.appendChild(cv)
    canvasRef.current = cv
    ctxRef.current = ctx

    const restored = loadOps()
    opsRef.current = restored.ops
    if (restored.problem) setNotice(restored.problem)
    sizeAndReplay()

    // The page wrapper, not the layer, is what actually grows as images load.
    const ro = new ResizeObserver(() => sizeAndReplay())
    ro.observe(host.parentElement ?? document.body)

    const onDown = (e: PointerEvent) => {
      if (!activeRef.current) return
      // Primary button only — no pointerup follows a context menu, so a
      // right-click would start a stroke that never ends.
      if (e.button !== 0) return
      const target = e.target
      if (
        target instanceof Element &&
        target.closest('button, a, input, textarea, nav, [role="dialog"]')
      ) {
        return
      }
      downRef.current = true
      lastRef.current = [e.pageX, e.pageY]
      stamp(e.pageX, e.pageY)
    }

    const onMove = (e: PointerEvent) => {
      const last = lastRef.current
      if (!downRef.current || !activeRef.current || !last) return
      const [lx, ly] = last
      if (Math.hypot(e.pageX - lx, e.pageY - ly) < MOVE_MIN_PX) return
      addOp({
        k: 's',
        x1: lx,
        y1: ly,
        x2: e.pageX,
        y2: e.pageY,
        c: nextColor(),
        r: 8 + Math.random() * 14,
        sd: newSeed(),
      })
      lastRef.current = [e.pageX, e.pageY]
    }

    const onUp = () => {
      downRef.current = false
      lastRef.current = null
    }

    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    // Without these the brush stays stuck down after a cancelled gesture or an
    // alt-tab, and the next move paints a stroke the visitor never drew.
    window.addEventListener('pointercancel', onUp)
    window.addEventListener('blur', onUp)

    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('blur', onUp)
      ro.disconnect()
      // Flush rather than drop: clearing the timer alone would throw away the
      // last 400ms of painting every time the visitor leaves the page.
      if (saveTimerRef.current !== undefined) {
        window.clearTimeout(saveTimerRef.current)
        runSave()
      }
      cv.remove()
      canvasRef.current = null
      ctxRef.current = null
    }
  }, [addOp, nextColor, runSave, sizeAndReplay, stamp])

  return { layerRef, notice, dismissNotice, clear, splash }
}
