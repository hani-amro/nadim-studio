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

import { ARTWORKS, type Artwork } from '../../data/artworks'
import { title, orderLabel } from '../../i18n/strings'
import { useLang } from '../../i18n/useLang'
import { Dialog } from '../../components/Dialog'
import { useFinePointer } from '../../hooks/useFinePointer'

const UPPER = ARTWORKS.filter((a) => a.order % 2 === 1)
const LOWER = ARTWORKS.filter((a) => a.order % 2 === 0)

/**
 * The phone plan: the same corridor turned upright, entrance at the top.
 *
 * The wide plan needs 520px and on a phone it scrolled sideways with names
 * cut at the edge. Here the walk reads downward like the scroll that drives
 * it, the left wall's pieces sit left of the runner and the right wall's
 * right of it. Rows run in walking depth: the study-room door (z=-5400) comes
 * right after piece 04 (z=-5300), the rotunda and the sculpture archway
 * (z=-6820) right after piece 05 (z=-6700).
 */
type Row =
  | { kind: 'mark'; label: string; strong?: boolean }
  | { kind: 'art'; art: Artwork }
  | { kind: 'room'; label: string }

function phoneRows(t: ReturnType<typeof useLang>['t']): Row[] {
  const art = (i: number): Row[] => {
    const a = ARTWORKS[i]
    return a ? [{ kind: 'art', art: a }] : []
  }
  return [
    { kind: 'mark', label: t.mapEntrance, strong: true },
    { kind: 'mark', label: t.mapWing1 },
    ...art(0), ...art(1), ...art(2), ...art(3),
    { kind: 'room', label: t.studiesRoom },
    ...art(4),
    { kind: 'mark', label: t.mapRotunda },
    { kind: 'room', label: t.sculptureRoom },
    { kind: 'mark', label: t.mapWing2 },
    ...art(5), ...art(6), ...art(7),
    { kind: 'mark', label: t.mapExit, strong: true },
  ]
}

function PhonePlan() {
  const { t } = useLang()
  return (
    <ol className="relative my-6 grid list-none grid-cols-[1fr_22px_1fr] gap-y-1 p-0 sm:hidden">
      {/* The runner down the middle column. */}
      <li aria-hidden="true" className="pointer-events-none absolute inset-y-3 start-1/2 w-[22px] -translate-x-1/2 border-x border-brand-gold/45 bg-[linear-gradient(180deg,rgba(217,164,65,.16),rgba(217,164,65,.07))]">
        <span className="absolute inset-y-0 start-1/2 w-[3px] -translate-x-1/2 bg-[#7a1420]" />
      </li>
      {phoneRows(t).map((row, i) => {
        if (row.kind === 'mark') {
          return (
            <li
              key={i}
              className={`relative col-span-3 my-1 bg-[#1a1209] px-2 py-1 text-center ${row.strong ? 'text-xs text-brand-gold' : 'text-[11px] text-muted-museum'}`}
            >
              {row.label}
            </li>
          )
        }
        if (row.kind === 'room') {
          // Both rooms open off the left wall.
          return (
            <li key={i} className="relative col-start-1 flex min-h-9 items-center justify-end gap-2 pe-2 text-end text-[12px] text-[#d8c9a4] italic">
              {row.label}
              <span aria-hidden="true" className="h-4 w-2.5 shrink-0 rounded-t-full border border-brand-gold/70" />
            </li>
          )
        }
        const left = row.art.order % 2 === 1
        return (
          <li
            key={i}
            className={`relative flex min-h-11 items-center gap-2 ${left ? 'col-start-1 justify-end pe-2 text-end' : 'col-start-3 ps-2 text-start'}`}
          >
            <span className={`flex flex-col leading-tight ${left ? 'items-end' : 'items-start order-2'}`}>
              <span className={`font-display text-lg ${left ? 'text-brand-gold' : 'text-[#c9a45e]'}`}>{orderLabel(row.art.order)}</span>
              <span className="text-[12px] text-[#cbbc98]">{title(row.art)}</span>
            </span>
            <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${left ? 'bg-brand-gold' : 'order-1 bg-[#8a6a2e]'}`} />
          </li>
        )
      })}
    </ol>
  )
}

export function MapModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang()
  const fine = useFinePointer()

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
            <PhonePlan />

            <div className="my-7 hidden overflow-x-auto sm:block">
            <div className="relative h-[260px] min-w-[520px]">
              <div className="absolute inset-x-0 top-[112px] h-[38px] border-y border-brand-gold/45 bg-[linear-gradient(90deg,rgba(217,164,65,.16),rgba(217,164,65,.07))]" />
              <div className="absolute inset-x-0 top-[128px] h-[5px] bg-[#7a1420]" />
              <div className="absolute start-[-6px] top-24 h-[70px] w-3 bg-brand-gold" />
              <p className="absolute start-2 top-[230px] m-0 text-xs text-brand-gold">{t.mapEntrance}</p>
              <p className="absolute end-2 top-[230px] m-0 text-xs text-brand-gold">{t.mapExit}</p>

              <ul className="absolute start-[10%] end-[6%] top-8 m-0 flex list-none justify-between p-0">
                {UPPER.map((a) => (
                  <li key={a.id} className="text-center">
                    <span className="block font-display text-xl text-brand-gold">{orderLabel(a.order)}</span>
                    <span className="block text-[11px] text-[#cbbc98]">{title(a)}</span>
                  </li>
                ))}
              </ul>

              <ul className="absolute start-[10%] end-[6%] top-[168px] m-0 flex list-none justify-between p-0">
                {LOWER.map((a) => (
                  <li key={a.id} className="text-center">
                    <span className="block text-[11px] text-[#cbbc98]">{title(a)}</span>
                    <span className="block font-display text-xl text-[#c9a45e]">{orderLabel(a.order)}</span>
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
            <div className="hidden justify-between gap-3 border-t border-line-museum pt-4 text-xs text-muted-museum sm:flex">
              <span>{t.mapWing1}</span>
              <span>{t.mapRotunda}</span>
              <span>{t.mapWing2}</span>
            </div>

            <p className="mt-4 mb-0 text-xs text-muted-dim">{t.mapInventory}</p>
            <p className="mt-3 mb-0 text-xs text-muted-dim">{fine ? t.mapKeys : t.mapKeysCoarse}</p>
          </div>
        </div>
      )}
    </Dialog>
  )
}
