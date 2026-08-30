import { STRINGS, type Strings } from './strings'

/**
 * The site ships in English only, so this is a plain accessor rather than a
 * store. It stays a hook so the components do not all have to change if a
 * second language is ever added back.
 */
export function useLang(): { t: Strings } {
  return { t: STRINGS }
}
