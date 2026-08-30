import { useEffect, useId, useRef, type ReactNode } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface Props {
  open: boolean
  onClose: () => void
  /** Receives the id to put on the dialog's visible heading; that heading
   *  becomes the accessible name via aria-labelledby. */
  children: (titleId: string) => ReactNode
  className?: string
  /** Some overlays (the museum intro) close themselves and must not be
   *  dismissable by Escape or a backdrop click. */
  dismissable?: boolean
}

/**
 * A modal that behaves like one.
 *
 * Every overlay in the previous build was a bare positioned div: no role, no
 * accessible name, no focus move, no focus restore, and the whole page behind
 * stayed tabbable and readable by a screen reader. This handles all of that in
 * one place so no overlay can regress.
 */
export function Dialog({ open, onClose, children, className = '', dismissable = true }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const restoreTo = useRef<HTMLElement | null>(null)
  const titleId = useId()

  // Callers pass inline arrows, so `onClose` is a new function on every parent
  // render. Keeping it in a ref (rather than in the dependency array) stops the
  // whole trap from tearing down and re-arming mid-interaction, which used to
  // yank focus out of the field the visitor was typing in.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    // Remember who opened us, so focus can go home on close.
    restoreTo.current = document.activeElement as HTMLElement | null

    const node = ref.current
    if (node) {
      const first = node.querySelector<HTMLElement>(FOCUSABLE)
      ;(first ?? node).focus()
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissable) {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !node) return
      // Keep Tab inside the dialog.
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      )
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const firstEl = items[0]!
      const lastEl = items[items.length - 1]!
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    document.addEventListener('keydown', onKey, true)
    // Stop the page behind from scrolling under the overlay.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = prevOverflow
      // The opener can be gone or hidden by the time we close — a painting the
      // corridor engine culled, or a node React unmounted. Focusing a hidden
      // element silently drops focus to <body>, so fall back to <main>.
      const opener = restoreTo.current
      const usable =
        opener && opener.isConnected && opener.offsetParent !== null && typeof opener.focus === 'function'
      if (usable) opener.focus()
      else document.getElementById('main')?.focus()
    }
  }, [open, dismissable])

  if (!open) return null

  return (
    <div
      className={`fixed inset-0 z-60 flex items-center justify-center p-6 ${className}`}
      onMouseDown={(e) => {
        if (dismissable && e.target === e.currentTarget) onCloseRef.current()
      }}
    >
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="outline-none">
        {children(titleId)}
      </div>
    </div>
  )
}
