/**
 * Every user-facing string on the site, in both languages.
 *
 * The previous museum page had all of its copy as Arabic literals inside the
 * markup, which is what made it untranslatable. Nothing user-facing may be
 * written inline in a component; it goes here and is looked up by key.
 *
 * `Strings` is derived from the Arabic table, so adding a key without an
 * English translation is a type error rather than a silent fallback.
 */

import type { Artwork, Medium } from '../data/artworks'

export type Lang = 'ar' | 'en'

const ar = {
  dir: 'rtl',
  brand: 'مرسَم نديم',
  brandLatin: 'NADIM STUDIO',
  langBtn: 'EN',
  /** The lang attribute the toggle's own label is written in. */
  langBtnLang: 'en',

  // -- shared chrome --
  skip: 'اقفز عالمحتوى',
  navLabel: 'تنقّل الموقع',
  home: 'الرئيسية',
  contact: 'تواصل',
  close: 'إغلاق',
  dismiss: 'إغلاق التنبيه',
  back: '↩ رجوع',
  loading: 'عم نحمّل…',

  // -- landing --
  landingKicker: 'معرض شخصي — تجريد وألوان جريئة',
  landingLede: 'ثلاث غرف: معرض لوحات تقدر ترسم فوقه، جولة متحف تمشي فيها، وقاعة نحت تلف حولها. ابدأ من وين ما بدك.',
  roomGalleryTitle: 'المعرض',
  roomGalleryBody: 'ست لوحات، وقماشة تفاعلية بتترك أثرك عليها وأنت عم تتفرج.',
  roomGalleryCta: 'افتح المعرض ←',
  roomMuseumTitle: 'المتحف السينمائي',
  roomMuseumBody: 'جولة ثلاثية الأبعاد بين ثمان لوحات، مع غرفة دراسات ودفتر زوار.',
  roomMuseumCta: 'ابدأ الجولة ←',
  roomSculptureTitle: 'قاعة النحت',
  roomSculptureBody: '«الضربة» — برونز على رخام، تقدر تدور حولها وتقرّب عليها.',
  roomSculptureCta: 'شوف المنحوتة ←',

  // -- gallery --
  galleryTitle: 'اللوحات',
  galleryYears: '٢٠١٩ — ٢٠٢٦',
  navWorks: 'اللوحات',
  navAbout: 'عن الفنان',
  navContact: 'اقتناء لوحة',
  navMuseum: 'المتحف ٣D',
  introWarn: 'تـنـبـيـه',
  introTitle1: 'دير بالك… من هاللحظة',
  introTitle2: 'بلّشت ترسم لوحتك',
  introBody: 'كل نقرة وكل مسحة منك رح تترك تلطّخة لون عاللوحة. التلطخات بتنحفظ عهالجهاز لحالك — بتلاقيها متل ما تركتها لما ترجع، وفيك تمسحها وقت ما بدك.',
  introEnter: 'افتح الباب وابدأ لوحتك',
  heroKicker: 'معرض شخصي — تجريد وألوان جريئة',
  heroTitle1: 'اللون ما بينسى',
  heroTitle2: 'مين لمسو',
  heroBody: 'جولة بين لوحات رسمتها على مدى سنين — وأنت عم تتجول، إيدك عم ترسم فوقها لوحة تانية.',
  heroHintCoarse: 'انزل لتحت — وجرّب تكبس بأي مكان',
  heroHintFine: 'انزل لتحت — وجرّب تكبس أو تسحب بأي مكان',
  aboutTitle: 'عن الفنان',
  aboutP1: 'بشتغل بالزيت والأكريليك على قماش من أكتر من عشر سنين. اللوحة عندي ما بتخلص لما وقّعها — بتخلص لما حدا يوقف قدامها ويتركها تغيّر شي فيه.',
  aboutP2: 'لهيك هالموقع مبني هيك: مش صالة عرض تتفرج فيها من بعيد، هو قماشة كبيرة، وأنت واحد من ألوانها.',
  portraitAlt: 'صورة الفنان بالمرسم',
  contactTitle: 'حابب تقتني لوحة؟',
  contactBody: 'ابعتلي، وخبرني أي لوحة وقّفتك — أو خلينا نرسم وحدة إلك من الصفر.',
  contactBtn: 'تواصل معي',
  footer: '© ٢٠٢٦ مرسَم نديم — التلطخات يلي عالشاشة من رسمك إنت',
  reset: 'امسح تلطخاتك وابدأ من جديد',

  // -- museum --
  museumIntro1: 'مرسَم نديم يقدّم',
  museumIntro2: 'جولة لا تشبه المواقع',
  museumIntroTitle: 'فوت عَ عالم الرسم',
  museumIntroSub: 'A CINEMATIC GALLERY — ٢٠٢٦',
  museumEnter: 'ادخل المتحف',
  walkHint: 'مرّر لتحت أو استعمل الأسهم',
  walkHintLatin: 'SCROLL TO WALK',
  progressLabel: 'تقدّمك بالجولة',
  mapBtn: 'المخطط',
  mapTitle: 'مخطط المعرض',
  mapLatin: 'GALLERY MAP · NADIM STUDIO',
  mapEntrance: 'المدخل',
  mapExit: 'النهاية · دفتر الزوار',
  mapWing1: 'الجناح الأول · صخب اللون',
  mapWing2: 'الجناح التاني · همس المادة',
  mapRotunda: 'القاعة الدائرية',
  mapInventory: '٨ لوحات · غرفة دراسات · قاعة نحت · دفتر زوار',
  mapKeys: 'استعمل الأسهم أو السكرول للتنقل · Enter يفتح أقرب لوحة · Escape يرجّعك',
  mapZoomHint: 'اكبس لتكبير المخطط',
  mapClose: 'إغلاق المخطط',
  wing1: 'صخب اللون',
  wing2: 'همس المادة',
  wing1Label: 'الجناح الأول',
  wing2Label: 'الجناح التاني',
  studiesRoom: 'غرفة الدراسات',
  studiesEnter: 'ادخل غرفة الدراسات',
  studiesHint: 'دراسات ورق',
  studiesLatin: 'STUDIES',
  studiesBack: '↩ رجوع للممر',
  studyAlt: 'دراسة ورق رقم',
  sculptureRoom: 'قاعة النحت',
  sculptureFrom: 'من هون',
  openCloser: 'اكبس لتعاينها عن قرب',
  openLabel: 'عاين لوحة',
  closerSuffix: 'عن قرب',
  askAbout: 'اسأل عن هاللوحة',
  backToWalk: '↩ رجوع للجولة',
  uniqueSigned: 'نسخة وحيدة موقّعة',
  endKicker: 'نهاية الجولة',
  endLatin: 'END OF WALK',
  endTitle: 'وقّفتك لوحة؟',
  endBody: 'كل لوحة هون إلها نسخة وحيدة. اكتبلي وخبرني أي وحدة مشيت معك لبرا.',
  mirrorLead: 'آخر لوحة بالمعرض:',
  mirrorYou: 'أنت',
  mirrorHint: 'قرّب… شوف مين واقف بالإطار',

  // -- guestbook --
  gbOpen: '✍ دفتر الزوار',
  gbOpenLabel: 'افتح دفتر الزوار',
  gbTitle: 'دفتر الزوار',
  gbBody: 'اكتب كلمتك — بتنحفظ عهالجهاز لحالك، بترجع تلاقيها لما تفوت من جديد',
  gbName: 'اسمك',
  gbText: 'كلمتك',
  gbTextPh: 'كلمتك…',
  gbSign: 'وقّع',
  gbClose: 'إغلاق دفتر الزوار',
  gbAnon: 'زائر',
  gbEmpty: 'لسا ما وقّع حدا — كن أول واحد.',

  // -- sculpture --
  sculptKicker: 'قاعة النحت',
  sculptLatin: 'SCULPTURE ROOM',
  sculptName: 'الضربة',
  /** The caption's medium; its numbers come from SCULPTURE + localeNum. */
  sculptMedium: 'برونز على رخام',
  sculptSpin: 'دوران تلقائي',
  sculptQuote: '« أول ضربة فرشاة بتكون دايماً بالهوا قبل ما تلمس القماش. حاولت جمّدها بالبرونز. »',
  sculptHint: 'اسحب (أو بإصبعك) لتلف حول التمثال · قرّب بدولاب الماوس أو بإصبعين',
  sculptBackMuseum: '↩ رجوع للمتحف',
  sculptSr: 'منحوتة معروضة بثلاثة أبعاد: اسحب لتدور حولها.',
  sculptFailed: 'ما قدرنا نحمّل عارض الـ3D (يمكن الشبكة مقطوعة).',

  // -- failures. A silent zero is the worst possible failure. --
  warnBlocked: 'المتصفح مانع الحفظ (وضع التصفح الخفي غالباً) — شغلك رح يروح لما تسكّر الصفحة.',
  warnQuota: 'مساحة التخزين بالمتصفح امتلت — الجديد ما عم ينحفظ.',
  warnCorrupt: 'المحفوظ كان تالف، فبلّشنا من صفحة بيضا.',
  warnTrimmed: 'وصلت للحد الأقصى — الأقدم عم ينمسح ليفسح مجال للجديد.',
  warnCanvas: 'ما قدرنا نشغّل القماشة التفاعلية عهالمتصفح.',
  gbNeedText: 'اكتب كلمتك قبل ما توقّع.',
  notFound: 'الصفحة يلي بتدوّر عليها مش موجودة.',

  // -- media, for the caption line --
  oil: 'زيت',
  acrylic: 'أكريليك',
  mixed: 'ميكس ميديا',
  cm: 'سم',
} as const

export type Strings = { readonly [K in keyof typeof ar]: string }

const en: Strings = {
  dir: 'ltr',
  brand: 'Nadim Studio',
  brandLatin: 'NADIM STUDIO',
  langBtn: 'عربي',
  langBtnLang: 'ar',

  skip: 'Skip to content',
  navLabel: 'Site navigation',
  home: 'Home',
  contact: 'Contact',
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
  navContact: 'Collect',
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
  aboutP1: 'I have worked in oil and acrylic on canvas for over ten years. A painting is not finished when I sign it — it is finished when someone stands before it and lets it change something in them.',
  aboutP2: 'That is why this site is built this way: not a gallery you watch from afar, but one large canvas — and you are one of its colours.',
  portraitAlt: 'The artist in the studio',
  contactTitle: 'Want to collect a piece?',
  contactBody: 'Write to me and tell me which painting stopped you — or let us paint one for you from scratch.',
  contactBtn: 'Get in touch',
  footer: '© 2026 Nadim Studio — the stains on screen are yours',
  reset: 'Wipe your stains and start over',

  museumIntro1: 'Nadim Studio presents',
  museumIntro2: 'A walk, not a website',
  museumIntroTitle: 'Step into the painting',
  museumIntroSub: 'A CINEMATIC GALLERY — 2026',
  museumEnter: 'Enter the museum',
  walkHint: 'Scroll down or use the arrow keys',
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
  mapZoomHint: 'Click to enlarge the map',
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
  sculptureRoom: 'The sculpture room',
  sculptureFrom: 'This way',
  openCloser: 'Click to see it closer',
  openLabel: 'View',
  closerSuffix: 'up close',
  askAbout: 'Ask about this piece',
  backToWalk: '↩ Back to the walk',
  uniqueSigned: 'Unique signed piece',
  endKicker: 'End of the walk',
  endLatin: 'END OF WALK',
  endTitle: 'Did one stop you?',
  endBody: 'Every piece here is unique. Write and tell me which one walked out with you.',
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
  sculptFailed: 'The 3D viewer could not load (the network may be down).',

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
}

export const STRINGS: Record<Lang, Strings> = { ar, en }

/** Per-language artwork titles and the artist's note on each piece. */
export const ARTWORK_COPY: Record<Lang, Record<string, { title: string; note: string }>> = {
  ar: {
    'quiet-explosion': { title: 'انفجار هادي', note: 'بلّشتها بضربة حمرا وحدة وتركتها أسبوع. كل ما رجعت عليها كانت تطلب مني أقل — هي اللوحة علّمتني إنو الهدوء ممكن ينفجر.' },
    'screaming-blue': { title: 'أزرق يصرخ', note: 'الأزرق هون مش لون، هو صوت. رسمتها بليلة واحدة بعد عاصفة، والقماش نشف قبل ما أهدى أنا.' },
    'memory-of-rust': { title: 'ذاكرة صدفة', note: 'صدفة لقيتها عالبحر وضلت سنتين عرفي قبل ما فهمت شو بدها تقول. هاللوحة هي جوابها.' },
    'old-walls': { title: 'حيطان قديمة', note: 'قشور الحيطان بالمدينة القديمة بتحكي أكتر من سكانها. جمعت ألوانها متل ما بينجمع الذكريات — طبقة فوق طبقة.' },
    'inner-noise': { title: 'ضجيج داخلي', note: 'في ضجيج ما بينسمع إلا من جوا. حاولت رسمو بدل ما اسمعو، وطلعت هي.' },
    'ash-dance': { title: 'رقصة رماد', note: 'الرماد آخر شي بيبقى من النار — بس بهاللوحة خليتو يرقص بدل ما يموت.' },
    'window-for-light': { title: 'نافذة للضو', note: 'كل بيت قديم إلو نافذة بتعرف الضو قبل أهلو. هي النافذة يلي كنت اتطلع منها وأنا صغير.' },
    'untitled-7': { title: 'بلا عنوان ٧', note: 'ما كل لوحة بدها اسم. هي بدها بس حدا يوقف قدامها أطول من دقيقة.' },
  },
  en: {
    'quiet-explosion': { title: 'Quiet Explosion', note: 'It began with one red stroke and I left it for a week. Every time I came back it asked less of me — this painting taught me that quiet can detonate.' },
    'screaming-blue': { title: 'Screaming Blue', note: 'The blue here is not a colour, it is a sound. Painted in one night after a storm; the canvas dried before I did.' },
    'memory-of-rust': { title: 'Memory of Rust', note: 'I found the shell on the shore and kept it two years before I understood what it wanted to say. This painting is its answer.' },
    'old-walls': { title: 'Old Walls', note: 'The peeling walls of the old city say more than the people in it. I gathered their colours the way memories gather — layer over layer.' },
    'inner-noise': { title: 'Inner Noise', note: 'Some noise can only be heard from the inside. I tried to paint it instead of listening to it, and this is what came out.' },
    'ash-dance': { title: 'Ash Dance', note: 'Ash is the last thing fire leaves behind — here I let it dance instead of die.' },
    'window-for-light': { title: 'A Window for Light', note: 'Every old house has a window that knows the light before its people do. This is the one I used to look through as a child.' },
    'untitled-7': { title: 'Untitled 7', note: 'Not every painting needs a name. This one only needs someone to stand in front of it for longer than a minute.' },
  },
}

const MEDIUM_KEY: Record<Medium, keyof Strings> = { oil: 'oil', acrylic: 'acrylic', mixed: 'mixed' }

/** Arabic-Indic digits, so a caption never mixes numeral systems mid-sentence. */
export function localeNum(n: number, lang: Lang): string {
  const s = String(n)
  if (lang !== 'ar') return s
  return s.replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]!)
}

export function mediumLabel(a: Artwork, t: Strings): string {
  return t[MEDIUM_KEY[a.medium]]
}

/** "زيت — ٢٠٢٤" / "Oil — 2024" */
export function captionMeta(a: Artwork, t: Strings, lang: Lang): string {
  return `${mediumLabel(a, t)} — ${localeNum(a.year, lang)}`
}

/** "١٢٠ × ٩٠ سم" / "120 × 90 cm" */
export function sizeLabel(a: Artwork, t: Strings, lang: Lang): string {
  return `${localeNum(a.size.w, lang)} × ${localeNum(a.size.h, lang)} ${t.cm}`
}

/** "٠١" / "01" — two digits in the numeral system of the active language. */
export function orderLabel(order: number, lang: Lang): string {
  return localeNum(order, lang).padStart(2, lang === 'ar' ? '٠' : '0')
}

export function title(a: Artwork, lang: Lang): string {
  return ARTWORK_COPY[lang][a.id]?.title ?? a.id
}

export function note(a: Artwork, lang: Lang): string {
  return ARTWORK_COPY[lang][a.id]?.note ?? ''
}
