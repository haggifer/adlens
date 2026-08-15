import { ColorScheme } from '@/lib/design/types'

// Production color-scheme preference. Read on the server in the root layout so the first paint matches
// the persisted choice (no flash); written client-side by the header theme switcher.
export const SCHEME_COOKIE = 'adlens_scheme'

const DEFAULT_SCHEME: ColorScheme = 'dark'

export const parseScheme = (raw?: string): ColorScheme => (raw === 'light' ? 'light' : DEFAULT_SCHEME)

export const writeSchemeCookie = (scheme: ColorScheme) => {
    document.cookie = `${SCHEME_COOKIE}=${scheme}; path=/; max-age=31536000; samesite=lax`
}
