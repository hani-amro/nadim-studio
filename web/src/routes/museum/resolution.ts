/**
 * How coarsely the museum's layers are drawn. See Surface.tsx for why.
 */

/**
 * How many times smaller than life a big surface is laid out.
 *
 * A 3x phone shows each world pixel with more device pixels than a 1x laptop
 * does, so it gets a coarser box to land on about the same texture size.
 */
export const LOW = typeof window !== 'undefined' && window.devicePixelRatio >= 2 ? 6 : 4

/**
 * How much smaller than life a painting's own layer is drawn.
 *
 * A painting is never shown larger than about 0.6 of its CSS size — that is
 * the opened view, on every screen — so a texture at two thirds loses nothing
 * there and is 2.25 times lighter than one pinned at full size.
 */
export const PAINTING_LOW = 1.5
