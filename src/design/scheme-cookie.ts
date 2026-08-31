import { ColorScheme } from '@/design/types'

export const SCHEME_COOKIE = 'adlens_scheme'

const DEFAULT_SCHEME: ColorScheme = 'dark'

export const parseScheme = (raw?: string): ColorScheme => (raw === 'light' ? 'light' : DEFAULT_SCHEME)

export const writeSchemeCookie = (scheme: ColorScheme) => {
    document.cookie = `${SCHEME_COOKIE}=${scheme}; path=/; max-age=31536000; samesite=lax`
}
