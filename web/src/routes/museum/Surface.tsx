/**
 * Low-resolution planes for the 3D museum.
 *
 * In a CSS 3D scene every plane with a transform is its own GPU texture.
 * Written at life size (a floor slab is 1900x1400) the browser re-rasterised
 * each one whenever the camera changed how large it appeared, at whatever
 * scale its nearest edge needed: hundreds of megabytes of texture, redrawn in
 * the middle of the walk. Measured on an Intel UHD laptop with a real wheel
 * scroll that was 8fps with half-second frames; on a phone at 3x the textures
 * do not fit in memory at all, and the scene tears like a bad signal.
 *
 * The big surfaces are dark, soft gradients, so they are laid out at 1/LOW of
 * their size and scaled back up by their own transform, and `will-change`
 * pins the raster to that small box. The texture is LOW*LOW times smaller and
 * is not redrawn as the camera moves. The same walk then measures 50-70fps.
 *
 * Anything a visitor reads or looks at closely — the paintings, the captions,
 * the end wall — is NOT drawn this way.
 */

import type { CSSProperties, ReactNode } from 'react'
import { LOW } from './resolution'

interface SurfaceProps {
  /** Life size, as the plane stands in the world. */
  w: number
  h: number
  top: number | string
  marginLeft: number
  marginTop?: number
  transform: string
  /** Slabs that swing down from their top edge: floors and ceilings. */
  hinged?: boolean
  backfaceHidden?: boolean
  opacity?: number
  /** Overrides LOW for a plane that carries something finer, like lettering. */
  low?: number
  /** Background, borders and radius, painted on the life-size inner box. */
  paint?: CSSProperties
  children?: ReactNode
}

/** One low-resolution plane. Children are written in life-size pixels,
 *  exactly as they would be on a full-size plane. */
export function Surface({
  w, h, top, marginLeft, marginTop = 0, transform,
  hinged = false, backfaceHidden = false, opacity, low = LOW, paint, children,
}: SurfaceProps) {
  const lw = w / low
  const lh = h / low
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top,
        width: lw,
        height: lh,
        // The box shrinks toward the point its transform turns about, so that
        // point — and therefore the plane, once scaled back up — stays put.
        marginLeft: marginLeft + (w - lw) / 2,
        marginTop: marginTop + (hinged ? 0 : (h - lh) / 2),
        transform: `${transform} scale(${String(low)})`,
        transformOrigin: hinged ? 'top center' : undefined,
        backfaceVisibility: backfaceHidden ? 'hidden' : undefined,
        opacity,
        willChange: 'transform',
      }}
    >
      {/* A plain 2D scale rather than `zoom`: it is painted into the parent's
          texture either way, and it behaves the same in every browser. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: w,
          height: h,
          boxSizing: 'border-box',
          transform: `scale(${String(1 / low)})`,
          transformOrigin: '0 0',
          ...paint,
        }}
      >
        {children}
      </div>
    </div>
  )
}
