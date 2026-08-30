/**
 * Site-wide configuration.
 *
 * CONTACT_EMAIL is a placeholder. It is the only contact route on the site, so
 * a real address must replace it before launch — every "get in touch" button
 * and every mailto link on every page reads from here.
 */
export const CONTACT_EMAIL = 'hello@example.com'

export const IS_PLACEHOLDER_EMAIL = CONTACT_EMAIL.endsWith('@example.com')

export const mailto = `mailto:${CONTACT_EMAIL}`

export const ROUTES = {
  home: '/',
  gallery: '/gallery',
  museum: '/museum',
  sculpture: '/sculpture',
} as const
