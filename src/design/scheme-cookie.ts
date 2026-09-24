import { ColorScheme } from '@/design/types'

export const SCHEME_COOKIE = 'adlens_scheme'

// Chromium sends the system preference in this client hint once the response asks for it (see next.config.ts).
export const SCHEME_HINT_HEADER = 'sec-ch-prefers-color-scheme'

export const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)'

const FALLBACK_SCHEME: ColorScheme = 'light'

const toScheme = (raw?: string): ColorScheme | null => (raw === 'light' || raw === 'dark' ? raw : null)

export interface InitialScheme {
    scheme: ColorScheme
    // Whether the user picked the scheme; otherwise the app keeps following the system preference.
    isStored: boolean
}

export const resolveInitialScheme = (cookieValue?: string, hintValue?: string): InitialScheme => {
    const stored = toScheme(cookieValue)

    if (stored) {
        return { scheme: stored, isStored: true }
    }

    // The hint is a structured-header string, so browsers send it quoted: "dark".
    const hinted = toScheme(hintValue?.replaceAll('"', ''))

    return { scheme: hinted ?? FALLBACK_SCHEME, isStored: false }
}

export const writeSchemeCookie = (scheme: ColorScheme) => {
    document.cookie = `${SCHEME_COOKIE}=${scheme}; path=/; max-age=31536000; samesite=lax`
}
