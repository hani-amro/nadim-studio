/**
 * Every user-facing string on the site.
 *
 * The site is English only. Copy still lives here rather than inline in the
 * components, so a wording change is one edit in one file and nothing
 * user-facing is buried in JSX.
 */

import type { Artwork, Medium } from '../data/artworks'

export const STRINGS = {
  brand: 'Nadim Studio',
  brandLatin: 'NADIM STUDIO',

  // The persistent notice bar. It is the first thing in the layout and it is
  // on every route, because the rest of this site is a convincing fiction and
  // a visitor is owed that fact before they read a word of it.
  demoTag: 'DEMO',
  demoLabel: 'What this site is',
  demoLead: 'A front-end demo by',
  demoAuthor: 'Hani Amro',
  demoBody: 'Nadim Studio is an invented artist — the paintings are generated graphics, nothing is for sale.',
  demoNewTab: '(opens in a new tab)',

  skip: 'Skip to content',
  navLabel: 'Site navigation',
  home: 'Home',
  portfolio: 'Portfolio',
  close: 'Close',
  dismiss: 'Dismiss notice',
  back: '↩ Back',
  loading: 'Loading…',

  landingKicker: 'Solo exhibition — bold abstraction',
  landingLede: 'Three rooms: a gallery you can paint on, a museum you walk through, and a sculpture you can circle. Start wherever you like.',
  roomGalleryTitle: 'The Gallery',
  roomGalleryBody: 'Six paintings, and a canvas that keeps your trace while you look.',
  roomGalleryCta: 'Open the gallery →',
  roomMuseumTitle: 'The Cinematic Museum',
  roomMuseumBody: 'A 3D walk past eight paintings, with a study room and a guest book.',
  roomMuseumCta: 'Start the walk →',
  roomSculptureTitle: 'The Sculpture Room',
  roomSculptureBody: '“The Stroke” — bronze on marble, free to circle and zoom.',
  roomSculptureCta: 'See the sculpture →',

  galleryTitle: 'The Works',
  galleryYears: '2019 — 2026',
  navWorks: 'Works',
  navAbout: 'About',
  navContact: 'About this demo',
  navMuseum: '3D Museum',
  introWarn: 'W A R N I N G',
  introTitle1: 'Careful… from this moment',
  introTitle2: 'you started painting',
  introBody: 'Every click and every swipe leaves a stain of colour on the canvas. Your stains are saved on this device only — they will be waiting exactly as you left them, and you can wipe them whenever you like.',
  introEnter: 'Open the door & start your painting',
  heroKicker: 'Solo exhibition — bold abstraction',
  heroTitle1: 'Colour never forgets',
  heroTitle2: 'who touched it',
  heroBody: 'A walk through paintings made over the years — and as you walk, your hand paints another one on top.',
  heroHintCoarse: 'Scroll down — and try tapping anywhere',
  heroHintFine: 'Scroll down — and try clicking or dragging anywhere',
  aboutTitle: 'About the artist',
  // Written for the demo and kept in the invented painter's voice. It is
  // framed as a quotation and signed as a fiction, so it can never be read as
  // a real person's claim about a real career.
  aboutNote: 'Nadim is invented for this demo. These are his lines, in his voice — no living painter said them.',
  aboutP1: 'I have worked in oil and acrylic on canvas for over ten years. A painting is not finished when I sign it — it is finished when someone stands before it and lets it change something in them.',
  aboutP2: 'That is why this site is built this way: not a gallery you watch from afar, but one large canvas — and you are one of its colours.',
  aboutCite: 'Nadim, a painter who does not exist',
  // No portraitAlt: there is no artist, so there is no portrait to caption.
  // The block shows one of the generated paintings, captioned as itself.
  contactTitle: 'None of this is for sale',
  contactBody: 'Nadim Studio is a demo. The artist is invented, the paintings are graphics generated during the build, and there is no gallery to write to. What is real is the front-end work — that is on the portfolio.',
  contactBtn: 'See the portfolio →',
  footer: '© 2026 Nadim Studio — the stains on screen are yours',
  reset: 'Wipe your stains and start over',
  footerPlain: '© 2026 Nadim Studio',

  museumIntro1: 'Nadim Studio presents',
  museumIntro2: 'A walk, not a website',
  museumIntroTitle: 'Step into the painting',
  museumIntroSub: 'A CINEMATIC GALLERY — 2026',
  museumEnter: 'Enter the museum',
  walkHint: 'Scroll down or use the arrow keys',
  walkHintCoarse: 'Swipe up to walk',
  walkHintLatin: 'SCROLL TO WALK',
  progressLabel: 'Your progress through the walk',
  mapBtn: 'Map',
  mapTitle: 'Gallery map',
  mapLatin: 'GALLERY MAP · NADIM STUDIO',
  mapEntrance: 'Entrance',
  mapExit: 'End · guest book',
  mapWing1: 'Wing one · The clamour of colour',
  mapWing2: 'Wing two · The whisper of matter',
  mapRotunda: 'The rotunda',
  mapInventory: '8 paintings · study room · sculpture room · guest book',
  mapKeys: 'Arrows or scroll to move · Enter opens the nearest painting · Escape goes back',
  mapKeysCoarse: 'Swipe to move · tap a painting to open it · tap above its card to go back',
  mapZoomHint: 'Click to enlarge the map',
  mapZoomHintCoarse: 'Tap to open the map',
  mapClose: 'Close the map',
  wing1: 'The clamour of colour',
  wing2: 'The whisper of matter',
  wing1Label: 'Wing one',
  wing2Label: 'Wing two',
  studiesRoom: 'The study room',
  studiesEnter: 'Enter the study room',
  studiesHint: 'Works on paper',
  studiesLatin: 'STUDIES',
  studiesBack: '↩ Back to the corridor',
  studyAlt: 'Study on paper number',
  studiesEmpty: 'These three frames are empty on purpose. No works on paper were invented for this demo, and a placeholder would have been a lie hanging on a wall.',
  sculptureRoom: 'The sculpture room',
  sculptureFrom: 'This way',
  // The phone HUD's doorway chip, shown while the camera passes a door the
  // narrow view cannot see in the left wall.
  doorStudy: 'Step into the study room →',
  doorSculpture: 'On to the sculpture room →',
  openCloser: 'Click to see it closer',
  openCloserCoarse: 'Tap to see it closer',
  openLabel: 'View',
  closerSuffix: 'up close',
  askAbout: 'How this was built',
  backToWalk: '↩ Back to the walk',
  uniqueSigned: 'Unique signed piece',
  endKicker: 'End of the walk',
  endLatin: 'END OF WALK',
  endTitle: 'Did one stop you?',
  endBody: 'Nothing here can be bought — the walk, the frames and the paintings on them were all built for a front-end demo. The code behind it is the part you can actually take away.',
  mirrorLead: 'The last painting in the show:',
  mirrorYou: 'You',
  mirrorHint: 'Come closer… see who is standing in the frame',

  gbOpen: '✍ Guest book',
  gbOpenLabel: 'Open the guest book',
  gbTitle: 'Guest book',
  gbBody: 'Leave a word — it is saved on this device only, and will be here when you come back',
  gbName: 'Your name',
  gbText: 'Your words',
  gbTextPh: 'Your words…',
  gbSign: 'Sign',
  gbClose: 'Close the guest book',
  gbAnon: 'Visitor',
  gbEmpty: 'Nobody has signed yet — be the first.',

  sculptKicker: 'Sculpture room',
  sculptLatin: 'SCULPTURE ROOM',
  sculptName: 'The Stroke',
  sculptMedium: 'Bronze on marble',
  sculptSpin: 'Auto-rotate',
  sculptQuote: '“The first brushstroke is always in the air before it touches the canvas. I tried to freeze it in bronze.”',
  sculptHint: 'Drag (or swipe) to circle the sculpture · zoom with the wheel or two fingers',
  sculptBackMuseum: '↩ Back to the museum',
  sculptSr: 'A sculpture shown in 3D: drag to rotate around it.',
  sculptFailed: 'The 3D viewer could not start — this browser has no working WebGL.',

  warnBlocked: 'Your browser is blocking storage (private mode, most likely) — your work will be gone when you close the tab.',
  warnQuota: 'Browser storage is full — new work is no longer being saved.',
  warnCorrupt: 'The saved data was unreadable, so we started from a blank canvas.',
  warnTrimmed: 'You have hit the limit — the oldest marks are being dropped to make room.',
  warnCanvas: 'The interactive canvas could not start in this browser.',
  gbNeedText: 'Write something before you sign.',
  notFound: 'The page you are looking for does not exist.',

  oil: 'Oil',
  acrylic: 'Acrylic',
  mixed: 'Mixed media',
  cm: 'cm',
} as const

export type Strings = typeof STRINGS

/** Title and the artist's note for each piece. */
export const ARTWORK_COPY: Record<string, { title: string; note: string }> = {
  'quiet-explosion': { title: 'Quiet Explosion', note: 'It began with one red stroke and I left it for a week. Every time I came back it asked less of me — this painting taught me that quiet can detonate.' },
  'screaming-blue': { title: 'Screaming Blue', note: 'The blue here is not a colour, it is a sound. Painted in one night after a storm; the canvas dried before I did.' },
  'memory-of-rust': { title: 'Memory of Rust', note: 'I found the shell on the shore and kept it two years before I understood what it wanted to say. This painting is its answer.' },
  'old-walls': { title: 'Old Walls', note: 'The peeling walls of the old city say more than the people in it. I gathered their colours the way memories gather — layer over layer.' },
  'inner-noise': { title: 'Inner Noise', note: 'Some noise can only be heard from the inside. I tried to paint it instead of listening to it, and this is what came out.' },
  'ash-dance': { title: 'Ash Dance', note: 'Ash is the last thing fire leaves behind — here I let it dance instead of die.' },
  'window-for-light': { title: 'A Window for Light', note: 'Every old house has a window that knows the light before its people do. This is the one I used to look through as a child.' },
  'untitled-7': { title: 'Untitled 7', note: 'Not every painting needs a name. This one only needs someone to stand in front of it for longer than a minute.' },
}

const MEDIUM_KEY: Record<Medium, keyof Strings> = { oil: 'oil', acrylic: 'acrylic', mixed: 'mixed' }

export function mediumLabel(a: Artwork): string {
  return STRINGS[MEDIUM_KEY[a.medium]]
}

/** "Oil - 2024" */
export function captionMeta(a: Artwork): string {
  return `${mediumLabel(a)} \u2014 ${a.year}`
}

/** "120 x 90 cm" */
export function sizeLabel(a: Artwork): string {
  return `${a.size.w} \u00d7 ${a.size.h} ${STRINGS.cm}`
}

/** "01" - the two-digit ordinal used on the cards and along the corridor. */
export function orderLabel(order: number): string {
  return String(order).padStart(2, '0')
}

export function title(a: Artwork): string {
  return ARTWORK_COPY[a.id]?.title ?? a.id
}

export function note(a: Artwork): string {
  return ARTWORK_COPY[a.id]?.note ?? ''
}
