/**
 * Site-wide configuration.
 *
 * There is deliberately no contact address here. Nadim Studio is an invented
 * artist built for a front-end demo, so there is nobody to write to and nothing
 * to buy; every "get in touch" control on the site points at the portfolio of
 * the person who actually built it instead. The previous build shipped
 * `hello@example.com` behind five live CTAs — a placeholder that would have
 * gone out as if it were real.
 */
export const PORTFOLIO_URL = 'https://hani-amro.github.io/'

export const ROUTES = {
  home: '/',
  gallery: '/gallery',
  museum: '/museum',
  sculpture: '/sculpture',
} as const
