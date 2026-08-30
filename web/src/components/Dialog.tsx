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
        onClose()
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
      restoreTo.current?.focus?.()
    }
  }, [open, onClose, dismissable])

  if (!open) return null

  return (
    <div
      className={`fixed inset-0 z-60 flex items-center justify-center p-6 ${className}`}
      onMouseDown={(e) => {
        if (dismissable && e.target === e.currentTarget) onClose()
      }}
    >
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="outline-none">
        {children(titleId)}
      </div>
    </div>
  )
}
