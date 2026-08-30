# Nadim Studio

A painter's portfolio: a gallery page with an interactive canvas, a scroll-driven
3D museum walk, and a WebGL sculpture room. English, left-to-right.

## Running it

```bash
cd web
npm install
npm run dev        # dev server
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check, then a production build into `web/dist` |
| `npm run preview` | Serve the built output |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run lint` | ESLint, zero warnings allowed |

## Layout

```
web/
  src/
    data/artworks.ts     ← the only source of the collection and the corridor geometry
    data/site.ts         ← contact address and routes
    i18n/strings.ts      ← every user-facing string
    components/          ← Dialog (focus trap) · Notice · Artwork
    routes/
      Home.tsx
      Gallery.tsx        + usePaintCanvas.ts
      Museum.tsx         + useCorridor.ts + museum/
      Sculpture.tsx      + sculpture/scene.ts
legacy/                  ← the previous .dc.html build, kept for reference only;
                           nothing builds from it
```

**Stack:** React 19 · Vite 8 · TypeScript 5.9 (strict) · Tailwind 4 ·
react-router-dom 7 · three 0.185

## House rules

These are enforced by the tooling, not left to memory:

- **No user-facing strings written into components.** Every visible word comes
  from `src/i18n/strings.ts`, so a wording change is one edit in one file.
- **One source of truth for data.** Artwork and corridor geometry live in
  `artworks.ts`. The previous build kept three copies of that list, which is how
  its map ended up drawing the corridor backwards.
- **No silent failures.** Anything that fails to persist a visitor's work raises
  a `NoticeCode` and surfaces through `<Notice>`. No empty `catch`.
- **Accessibility.** Every overlay goes through `<Dialog>` (focus trap, focus
  restore, Escape); every image has a real `alt`; every control has an
  accessible name; tap targets are at least 44px; `prefers-reduced-motion` is
  honoured in both the CSS and the camera loop.
- **Logical CSS properties** (`ps-`/`pe-`/`ms-`/`me-`/`start`/`end`) in the UI
  chrome. Physical coordinates are used only inside the 3D scene geometry, where
  they describe world space rather than reading order.

## Deploying

```bash
docker build -t nadim-studio web/
docker run -p 8080:80 nadim-studio
```

Or upload the contents of `web/dist` to any static host — routing is hash-based,
so no server rewrite rules are needed.

## Before launch — not done

- [ ] **`CONTACT_EMAIL` in `web/src/data/site.ts` is still `hello@example.com`.**
      It is the only contact route on the site and must be replaced.
- [ ] **There is no photograph of the artist.** The About section shows a
      painting instead. Drop a portrait into `web/src/assets` and swap that
      block; `t.portraitAlt` is already there for it.
- [ ] **The study-room frames are empty.** No study images exist in the project,
      and placeholder images were deliberately not invented.
