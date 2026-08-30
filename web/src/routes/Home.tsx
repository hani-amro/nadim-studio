import { Link } from 'react-router-dom'
import { ROUTES } from '../data/site'
import { useLang } from '../i18n/useLang'
import { LangToggle } from '../components/LangToggle'

export function Home() {
  const { t } = useLang()

  const rooms = [
    { n: '٠١', nEn: '01', to: ROUTES.gallery, title: t.roomGalleryTitle, body: t.roomGalleryBody, cta: t.roomGalleryCta },
    { n: '٠٢', nEn: '02', to: ROUTES.museum, title: t.roomMuseumTitle, body: t.roomMuseumBody, cta: t.roomMuseumCta },
    { n: '٠٣', nEn: '03', to: ROUTES.sculpture, title: t.roomSculptureTitle, body: t.roomSculptureBody, cta: t.roomSculptureCta },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-start justify-between gap-4 px-5 pt-8 sm:px-10 sm:pt-14 lg:px-16">
        <div>
          <p className="mb-3 text-xs tracking-[0.3em] text-brand-gold sm:text-sm">{t.landingKicker}</p>
          <h1 className="font-display text-[clamp(2.4rem,9vw,5.5rem)] leading-tight font-bold">{t.brand}</h1>
        </div>
        <LangToggle className="mt-2 shrink-0" />
      </header>

      <main id="main" tabIndex={-1} className="flex-1 px-5 pt-6 pb-12 outline-none sm:px-10 lg:px-16">
        <p className="max-w-[46ch] text-base leading-loose font-light text-[#b8b0a4] sm:text-lg">{t.landingLede}</p>

        <ul className="mt-10 grid max-w-5xl list-none grid-cols-1 gap-5 p-0 md:grid-cols-3">
          {rooms.map((r, i) => (
            <li
              key={r.to}
              className="relative flex flex-col gap-2.5 border border-line bg-panel px-6 py-6 transition-[border-color,transform] duration-200 hover:-translate-y-1 hover:border-brand-gold focus-within:-translate-y-1 focus-within:border-brand-gold"
            >
              <span className="text-xs tracking-[0.25em] text-muted">{t.dir === 'rtl' ? r.n : r.nEn}</span>
              <h2 className="font-display text-2xl font-bold">{r.title}</h2>
              <p className="text-sm leading-relaxed font-light text-[#b8b0a4]">{r.body}</p>
              {/* The stretched pseudo-element keeps the whole card clickable
                  while the link stays the only tab stop. */}
              <Link
                to={r.to}
                className="mt-1 text-sm text-brand-gold after:absolute after:inset-0 after:content-['']"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {r.cta}
              </Link>
            </li>
          ))}
        </ul>
      </main>

      <footer className="px-5 pb-9 text-sm text-muted sm:px-10 lg:px-16">{t.footer}</footer>
    </div>
  )
}
