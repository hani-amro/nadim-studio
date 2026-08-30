import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Routes, Route, useLocation, Link } from 'react-router-dom'
import { ROUTES } from './data/site'
import { useLang } from './i18n/useLang'
import { Home } from './routes/Home'

// The museum ships a large 3D scene and the sculpture ships three.js; neither
// should be in the bundle a visitor downloads just to read the landing page.
const Gallery = lazy(() => import('./routes/Gallery').then((m) => ({ default: m.Gallery })))
const Museum = lazy(() => import('./routes/Museum').then((m) => ({ default: m.Museum })))
const Sculpture = lazy(() => import('./routes/Sculpture').then((m) => ({ default: m.Sculpture })))

/** A route change must move focus and reset scroll, or keyboard and screen
 *  reader users stay stranded where the previous page left them. */
function RouteChange() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    const main = document.getElementById('main')
    main?.focus()
  }, [pathname])
  return null
}

function Loading() {
  const { t } = useLang()
  return (
    <div className="flex min-h-screen items-center justify-center text-muted" role="status">
      {t.loading}
    </div>
  )
}

function NotFound() {
  const { t } = useLang()
  return (
    <main id="main" tabIndex={-1} className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center outline-none">
      <h1 className="font-display text-4xl">{t.brand}</h1>
      <p className="text-muted">{t.notFound}</p>
      <Link to={ROUTES.home} className="text-brand-gold underline">
        {t.home}
      </Link>
    </main>
  )
}

export function App() {
  return (
    // Hash routing so the built site works from any static host or a plain
    // file server without server-side rewrite rules.
    <HashRouter>
      <RouteChange />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path={ROUTES.home} element={<Home />} />
          <Route path={ROUTES.gallery} element={<Gallery />} />
          <Route path={ROUTES.museum} element={<Museum />} />
          <Route path={ROUTES.sculpture} element={<Sculpture />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
