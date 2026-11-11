import { useEffect, useState } from 'react'

/**
 * True when the primary pointer is a mouse or a pen.
 *
 * Copy that tells the visitor what to do has to match the hand they are
 * holding: "click" and "arrow keys" are noise on a phone, and on a touch
 * screen the scroller claims every drag, so a hint may only promise a tap.
 */
export function useFinePointer(): boolean {
  const [fine, setFine] = useState(() => window.matchMedia('(pointer: fine)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)')
    const onChange = (e: MediaQueryListEvent) => setFine(e.matches)
    // No initial setFine here: useState already read the same query lazily,
    // and repeating it only forces a second render on mount.
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return fine
}
