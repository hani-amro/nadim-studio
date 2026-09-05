# Nadim Studio

**A front-end demo by [Hani Amro](https://hani-amro.github.io/). Nadim Studio is an
invented artist — the paintings are generated graphics and nothing here is for sale.**

Everything below the fold is a fiction built to have something worth rendering: a
gallery page with an interactive canvas, a scroll-driven 3D museum walk, and a WebGL
sculpture room. The craft is real; the artist, the catalogue and the exhibition are
not. Every route carries a notice bar saying so, and the site makes no request to any
third-party host.

English, left-to-right.

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
    data/site.ts         ← the portfolio link and the routes
    i18n/strings.ts      ← every user-facing string
    assets/fonts/        ← self-hosted Amiri + IBM Plex Sans woff2, with their licences
    components/          ← DemoNotice (the bar) · Dialog (focus trap) · Notice · Artwork
    routes/
      Home.tsx
      Gallery.tsx        + usePaintCanvas.ts
      Museum.tsx         + useCorridor.ts + museum/
      Sculpture.tsx      + sculpture/scene.ts
legacy/                  ← the previous .dc.html build. Untracked and unbuilt: two of
                           its files are copied third-party starter scaffold with no
                           licence, so they are kept on disk for reference only.
```

**Stack:** React 19 · Vite 8 · TypeScript 5.9 (strict) · Tailwind 4 ·
react-router-dom 7 · three 0.185

## CREDITS

- **The eight images in `web/src/assets/paintings/` are generated placeholder
  graphics, produced during the build.** They are not photographs of physical
  artwork, and no physical artwork corresponds to them.
- **The catalogue is invented.** Every title, artist's note, medium, dimension and
  year (2019–2026) in `web/src/data/artworks.ts` and `web/src/i18n/strings.ts` was
  written for this demo. So were the sculpture, its dimensions and its quotation.
- **The artist is invented.** "Nadim" is a character. The first-person text in the
  About block is his voice, marked as a quotation and signed as a fiction; it is not
  anybody's biography.
- **Fonts** are self-hosted in `web/src/assets/fonts/`: Amiri and IBM Plex Sans, both
  under the SIL Open Font License 1.1. The licence text ships next to the files as
  `OFL-Amiri.txt` and `OFL-IBM-Plex-Sans.txt`.
- **This project's own code** is MIT licensed — see `LICENSE`.

## House rules

These are enforced by the tooling, not left to memory:

- **The demo notice is not optional.** `<DemoNotice>` lives in the App shell, above
  every overlay, on every route, and cannot be dismissed. It owns the `--demo-bar`
  CSS variable; every layout that fills the viewport offsets itself by that value.
- **No user-facing strings written into components.** Every visible word comes
  from `src/i18n/strings.ts`, so a wording change is one edit in one file.
- **One source of truth for data.** Artwork and corridor geometry live in
  `artworks.ts`. The previous build kept three copies of that list, which is how
  its map ended up drawing the corridor backwards.
- **No silent failures.** Anything that fails to persist a visitor's work raises
  a `NoticeCode` and surfaces through `<Notice>`. No empty `catch`.
- **No third-party requests.** The fonts are self-hosted and the paintings are
  bundled; a loaded page contacts nothing but the host it came from.
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

Or upload the contents of `web/dist` to any static host — the build uses a relative
base and hash-based routing, so it serves correctly from a subfolder with no rewrite
rules.
