import { ThemeConfig } from 'antd'
import { BODY_FONT_STACK } from '@/fonts'

// Seed-only theme: antd derives the whole palette from this one primary. The light/dark algorithm is
// intentionally not set here — antd-style's ThemeProvider applies it via `appearance` (see providers.tsx).
export const PRIMARY_COLOR = '#0d9488'
export const BORDER_RADIUS = 10

export const buildAntdTheme = (primaryColor: string = PRIMARY_COLOR): ThemeConfig => ({
    token: {
        colorPrimary: primaryColor,
        colorInfo: primaryColor,
        colorLink: primaryColor,
        borderRadius: BORDER_RADIUS,
        fontFamily: BODY_FONT_STACK,
    },
    components: {
        // antd buttons carry a default drop shadow via these component tokens; turned off app-wide for a flat look.
        Button: {
            primaryShadow: 'none',
            defaultShadow: 'none',
            dangerShadow: 'none',
        },
    },
})
