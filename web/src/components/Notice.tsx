import { useLang } from '../i18n/useLang'
import type { Strings } from '../i18n/strings'

/** The failure codes any feature that persists a visitor's work can raise. */
export type NoticeCode = 'blocked' | 'quota' | 'corrupt' | 'trimmed' | 'canvas' | 'needText'

const KEY: Record<NoticeCode, keyof Strings> = {
  blocked: 'warnBlocked',
  quota: 'warnQuota',
  corrupt: 'warnCorrupt',
  trimmed: 'warnTrimmed',
  canvas: 'warnCanvas',
  needText: 'gbNeedText',
}

/**
 * A visible, dismissible notice.
 *
 * The house rule is that a silent zero is the worst possible failure: the old
 * build swallowed every storage error in an empty catch, so a visitor kept
 * painting and lost everything without a word. Anything that fails to persist
 * their work has to surface here.
 */
export function Notice({ code, onDismiss }: { code: NoticeCode | null; onDismiss: () => void }) {
  const { t } = useLang()
  if (!code) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-3 z-90 mx-auto flex max-w-xl items-center gap-3 border border-brand-red bg-[#2a1a12] px-4 py-3 text-sm leading-relaxed text-ink"
    >
      <span aria-hidden="true" className="text-lg text-brand-red">
        !
      </span>
      <span className="flex-1">{t[KEY[code]]}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t.dismiss}
        className="min-h-11 min-w-11 cursor-pointer border border-[#5a4038] px-3 text-ink hover:border-brand-red"
      >
        ✕
      </button>
    </div>
  )
}
