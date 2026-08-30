import { artworkSrc, type Artwork as ArtworkData } from '../data/artworks'
import { captionMeta, title } from '../i18n/strings'
import { useLang } from '../i18n/useLang'

/**
 * A framed painting with its caption.
 *
 * The legacy gallery rendered six empty drop-zones: the slots carried no src at
 * all, so the one thing the page existed to show was never on it. Everything
 * here — photo, title, medium, year — comes from the collection data, so a
 * frame can only ever be empty if the photo file is genuinely missing, and
 * artworkSrc() throws loudly in that case rather than rendering a blank box.
 */

interface Props {
  art: ArtworkData
  /** Grid placement, supplied by whichever page is laying the pieces out. */
  className?: string
  /** The frame's own box — its height or aspect ratio. */
  frameClassName?: string
  /** Above-the-fold pieces load eagerly; everything else waits. */
  eager?: boolean
}

export function Artwork({ art, className = '', frameClassName = '', eager = false }: Props) {
  const { lang, t } = useLang()
  const name = title(art, lang)
  const meta = captionMeta(art, t, lang)

  return (
    <figure id={art.id} className={`m-0 ${className}`}>
      <div className={`relative border border-line bg-panel p-2.5 min-[700px]:p-3.5 ${frameClassName}`}>
        <img
          src={artworkSrc(art)}
          alt={`${name} — ${meta}`}
          // The photos are all 720×570; the intrinsic ratio keeps the box from
          // collapsing before the frame's own aspect-ratio resolves.
          width={720}
          height={570}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className="block h-full w-full object-cover"
        />
      </div>
      {/* The caption wraps: on a narrow phone the title and the medium line
          cannot share a row without one of them being cut. */}
      <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <span className="font-display text-[clamp(17px,4.4vw,21px)] leading-snug">{name}</span>
        <span className="text-[13px] text-muted">{meta}</span>
      </figcaption>
    </figure>
  )
}
