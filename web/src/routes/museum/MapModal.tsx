/**
 * The gallery map.
 *
 * The previous build drew this map backwards. The entrance marker sits at the
 * inline-start edge and, in an RTL flex row, the first child renders there —
 * but the two rails were hand-written as 07, 05, 03, 01 and 02, 04, 06, 08.
 * Painting 01, the first one you actually reach at z=-1100, was therefore
 * drawn at the far exit end, and the wing labels underneath ran the same way.
 *
 * Both rails are now derived from ARTWORKS in walking order, so the drawing
 * cannot drift away from the corridor again: odd pieces on the upper rail,
 * even ones on the lower, entrance first in both.
 */

import { ARTWORKS } from '../../data/artworks'
import { title, orderLabel } from '../../i18n/strings'
import { useLang } from '../../i18n/useLang'
import { Dialog } from '../../components/Dialog'

const UPPER = ARTWORKS.filter((a) => a.order % 2 === 1)
const LOWER = ARTWORKS.filter((a) => a.order % 2 === 0)

export function MapModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang } = useLang()

  return (
    <Dialog open={open} onClose={onClose} className="bg-[rgba(5,4,3,.93)]">
      {(titleId) => (
        <div className="w-[880px] max-w-[94vw] bg-[linear-gradient(160deg,#d9a441,#8a6a2e_55%,#b58a3c)] p-1">
          <div className="max-h-[86vh] overflow-y-auto bg-[linear-gradient(160deg,#241a0c,#120c06)] px-6 py-7 sm:px-9 sm:py-8">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <h2 id={titleId} className="m-0 font-display text-2xl text-ink-museum sm:text-3xl">
                  {t.mapTitle}
                </h2>
                <p className="mt-1.5 mb-0 text-xs tracking-[0.25em] text-muted-museum">{t.mapLatin}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t.mapClose}
                className="min-h-11 min-w-11 shrink-0 cursor-pointer border-0 bg-transparent text-2xl text-muted-museum hover:text-brand-gold"
              >
                ✕
              </button>
            </div>

            {/* The plan view. `start`/`end` throughout: the entrance belongs at
                the inline start, which is where the walk begins in both
                reading directions. */}
            <div className="my-7 overflow-x-auto">
            <div className="relative h-[260px] min-w-[520px]">
              <div className="absolute inset-x-0 top-[112px] h-[38px] border-y border-brand-gold/45 bg-[linear-gradient(90deg,rgba(217,164,65,.16),rgba(217,164,65,.07))]" />
              <div className="absolute inset-x-0 top-[128px] h-[5px] bg-[#7a1420]" />
              <div className="absolute start-[-6px] top-24 h-[70px] w-3 bg-brand-gold" />
              <p className="absolute start-2 top-[230px] m-0 text-xs text-brand-gold">{t.mapEntrance}</p>
              <p className="absolute end-2 top-[230px] m-0 text-xs text-brand-gold">{t.mapExit}</p>

              <ul className="absolute start-[10%] end-[6%] top-8 m-0 flex list-none justify-between p-0">
                {UPPER.map((a) => (
                  <li key={a.id} className="text-center">
                    <span className="block font-display text-xl text-brand-gold">{orderLabel(a.order, lang)}</span>
                    <span className="block text-[11px] text-[#cbbc98]">{title(a, lang)}</span>
                  </li>
                ))}
              </ul>

              <ul className="absolute start-[10%] end-[6%] top-[168px] m-0 flex list-none justify-between p-0">
                {LOWER.map((a) => (
                  <li key={a.id} className="text-center">
                    <span className="block text-[11px] text-[#cbbc98]">{title(a, lang)}</span>
                    <span className="block font-display text-xl text-[#c9a45e]">{orderLabel(a.order, lang)}</span>
                  </li>
                ))}
              </ul>

              <div className="absolute start-[46%] top-[104px] h-[54px] w-[54px] rounded-full border-2 border-brand-gold bg-brand-gold/10" />
              {/* Ordered by depth along the walk: the study room (z=-5400) is
                  reached before the sculpture archway (z=-6820). */}
              <p className="absolute start-[36%] top-[236px] m-0 text-[11px] text-[#d8c9a4]">{t.studiesRoom}</p>
              <p className="absolute start-[66%] top-[236px] m-0 text-[11px] text-[#d8c9a4]">{t.sculptureRoom}</p>
            </div>
            </div>

            {/* Entrance first here too — the old build listed wing two first. */}
            <div className="flex justify-between gap-3 border-t border-line-museum pt-4 text-xs text-muted-museum">
              <span>{t.mapWing1}</span>
              <span>{t.mapRotunda}</span>
              <span>{t.mapWing2}</span>
            </div>

            <p className="mt-4 mb-0 text-xs text-muted-dim">{t.mapInventory}</p>
            <p className="mt-3 mb-0 text-xs text-muted-dim">{t.mapKeys}</p>
          </div>
        </div>
      )}
    </Dialog>
  )
}
