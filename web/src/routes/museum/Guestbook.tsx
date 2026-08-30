/**
 * The guest book at the end of the walk.
 *
 * The copy promises that a note is kept on this device only, and the code has
 * to keep that promise honestly: `onSign` reports whether the write actually
 * landed, and a note that failed to persist is never added to the list or
 * cleared from the textarea — the visitor keeps their words and sees why.
 */

import { useId, useRef, useState, type FormEvent } from 'react'
import { Dialog } from '../../components/Dialog'
import type { NoticeCode } from '../../components/Notice'
import { useLang } from '../../i18n/useLang'

export interface GuestNote {
  name: string
  text: string
}

interface Props {
  open: boolean
  onClose: () => void
  notes: readonly GuestNote[]
  /** Persists the note. Returns false when the browser refused the write, in
   *  which case the caller has already raised the matching notice. */
  onSign: (note: GuestNote) => boolean
  onNotice: (code: NoticeCode) => void
}

const FIELD =
  'w-full border border-line-museum bg-[#0d0a07] px-4 py-3 text-base text-ink-museum placeholder:text-muted-dim'

export function Guestbook({ open, onClose, notes, onSign, onNotice }: Props) {
  const { t } = useLang()
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const textRef = useRef<HTMLTextAreaElement>(null)
  const nameId = useId()
  const textId = useId()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const body = text.trim()
    if (!body) {
      onNotice('needText')
      textRef.current?.focus()
      return
    }
    const saved = onSign({ name: name.trim() || t.gbAnon, text: body })
    // Only clear the field once the note is genuinely stored; otherwise the
    // visitor would watch their words disappear into a failed write.
    if (saved) setText('')
  }

  return (
    <Dialog open={open} onClose={onClose} className="bg-[rgba(5,4,3,.9)]">
      {(titleId) => (
        <div className="max-h-[82vh] w-[560px] max-w-[94vw] overflow-y-auto border border-line-museum bg-panel-museum px-6 py-8 sm:px-10">
          <div className="mb-2 flex items-baseline justify-between gap-4">
            <h2 id={titleId} className="m-0 font-display text-2xl text-ink-museum sm:text-3xl">
              {t.gbTitle}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t.gbClose}
              className="min-h-11 min-w-11 shrink-0 cursor-pointer border-0 bg-transparent text-2xl text-muted-museum hover:text-brand-gold"
            >
              ✕
            </button>
          </div>
          <p className="mt-0 mb-6 text-sm leading-relaxed text-muted-museum">{t.gbBody}</p>

          <form onSubmit={submit} className="mb-7 flex flex-col gap-3">
            {/* Real labels, always visible. A placeholder vanishes the moment
                someone starts typing and is not an accessible name. */}
            <label htmlFor={nameId} className="text-sm text-muted-museum">
              {t.gbName}
            </label>
            <input
              id={nameId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              /* 16px minimum, or iOS Safari zooms the whole page on focus. */
              className={FIELD}
            />

            <label htmlFor={textId} className="text-sm text-muted-museum">
              {t.gbText}
            </label>
            <textarea
              id={textId}
              ref={textRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder={t.gbTextPh}
              className={`${FIELD} resize-y`}
            />

            <button
              type="submit"
              className="min-h-11 cursor-pointer border-0 bg-brand-gold px-4 py-3.5 text-base font-medium text-[#0b0805] hover:bg-brand-gold-bright"
            >
              {t.gbSign}
            </button>
          </form>

          {notes.length === 0 ? (
            <p className="m-0 text-sm text-muted-dim">{t.gbEmpty}</p>
          ) : (
            <ul className="m-0 list-none p-0">
              {notes.map((n, i) => (
                <li
                  key={`${i}:${n.name}`}
                  className="mb-3 border-s-2 border-brand-gold bg-brand-gold/5 px-4 py-2.5"
                >
                  <p className="mt-0 mb-1 font-display text-lg text-ink-museum">{n.text}</p>
                  <p className="m-0 text-xs text-muted-museum">— {n.name}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Dialog>
  )
}
