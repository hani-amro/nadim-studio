/**
 * The single source of truth for the collection.
 *
 * In the previous build the gallery page and the museum page each carried their
 * own copy of this list, and the museum's map modal carried a third. That is how
 * the map ended up listing the paintings in reverse walking order. Everything
 * that shows a painting now derives from this array.
 *
 * `order` is the walking order down the museum corridor (painting 1 is the first
 * one you meet). `file` is the photo in /paintings.
 */

export type Medium = 'oil' | 'acrylic' | 'mixed'

export interface Artwork {
  /** Stable id, also used as the DOM id and the focus target. */
  id: string
  /** 1-based position along the corridor. */
  order: number
  file: string
  medium: Medium
  year: number
  /** Centimetres, as the piece is catalogued. */
  size: { w: number; h: number }
  /** Shown in the gallery grid; six of the eight appear there. */
  inGallery: boolean
}

export const ARTWORKS: readonly Artwork[] = [
  { id: 'quiet-explosion', order: 1, file: 'art1.png', medium: 'oil', year: 2024, size: { w: 120, h: 90 }, inGallery: true },
  { id: 'screaming-blue', order: 2, file: 'art2.png', medium: 'acrylic', year: 2023, size: { w: 100, h: 80 }, inGallery: true },
  { id: 'memory-of-rust', order: 3, file: 'art3.png', medium: 'oil', year: 2026, size: { w: 140, h: 100 }, inGallery: true },
  { id: 'old-walls', order: 4, file: 'art4.png', medium: 'mixed', year: 2022, size: { w: 90, h: 90 }, inGallery: true },
  { id: 'inner-noise', order: 5, file: 'art5.png', medium: 'oil', year: 2025, size: { w: 120, h: 80 }, inGallery: true },
  { id: 'ash-dance', order: 6, file: 'art6.png', medium: 'acrylic', year: 2021, size: { w: 100, h: 100 }, inGallery: false },
  { id: 'window-for-light', order: 7, file: 'art7.png', medium: 'oil', year: 2020, size: { w: 80, h: 60 }, inGallery: false },
  { id: 'untitled-7', order: 8, file: 'art8.png', medium: 'acrylic', year: 2019, size: { w: 150, h: 110 }, inGallery: false },
] as const

/** Corridor geometry — one place, so the HUD counter and the keyboard
 *  navigation can never disagree about which painting you are standing at. */
export const CORRIDOR = {
  /** Depth (px) of the first painting. */
  FIRST: 1100,
  /** Depth (px) between consecutive paintings. */
  STEP: 1400,
  /** Total scrollable depth of the walk. */
  DEPTH: 13000,
} as const

export const COUNT = ARTWORKS.length

export const GALLERY_ARTWORKS = ARTWORKS.filter((a) => a.inGallery)

/**
 * Resolved, content-hashed URLs for the photos.
 *
 * These live in src/assets (not public/) so Vite fingerprints them and the
 * URLs stay correct on nested routes regardless of the deploy base — a plain
 * `./paintings/x.png` would break on /museum with a relative base.
 */
const PHOTOS = import.meta.glob<string>('../assets/paintings/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
})

export function artworkSrc(a: Artwork): string {
  const url = PHOTOS[`../assets/paintings/${a.file}`]
  // A missing photo must be loud, not an invisible broken frame.
  if (!url) throw new Error(`artworkSrc: no bundled photo for "${a.file}"`)
  return url
}

/** Depth of painting `i` (0-based) along the corridor. */
export function paintingZ(i: number): number {
  return -(CORRIDOR.FIRST + i * CORRIDOR.STEP)
}

/** Which painting the camera is closest to, given the current depth. */
export function nearestIndex(cam: number): number {
  return Math.max(0, Math.min(COUNT - 1, Math.round((cam - CORRIDOR.FIRST) / CORRIDOR.STEP)))
}
