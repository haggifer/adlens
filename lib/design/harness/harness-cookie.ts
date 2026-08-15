import { PRIMARY_COLOR } from '@/lib/design/theme'

// TEMPORARY — design harness only. Persists the DevBar's primary-color override so previewing a
// different brand accent survives a reload. Delete this file when the harness is stripped.
export const HARNESS_COOKIE = 'adlens_harness'

export const parseHarnessPrimary = (raw?: string): string => {
    if (!raw) {
        return PRIMARY_COLOR
    }

    try {
        return decodeURIComponent(raw)
    } catch {
        return PRIMARY_COLOR
    }
}

export const writeHarnessPrimary = (color: string) => {
    document.cookie = `${HARNESS_COOKIE}=${encodeURIComponent(color)}; path=/; max-age=31536000; samesite=lax`
}
