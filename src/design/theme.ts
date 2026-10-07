import { BODY_FONT_STACK } from '@/fonts'
import { ThemeConfig } from 'antd'
import type { ColorScheme } from './types'

// Seed-only theme: antd derives the whole palette from one primary per scheme. The light/dark algorithm is
// intentionally not set here — antd-style's ThemeProvider applies it via `appearance` (see Providers.tsx).
// White text on a primary button needs 4.5:1. Light mode gets a deeper teal (5.5:1; #0d9488 gave 3.7:1). Dark mode
// keeps #0d9488: the algorithm already deepens it for buttons (4.8:1), and a darker seed would sink teal text on the
// dark background to about 3:1.
const PRIMARY_COLORS: Record<ColorScheme, string> = { light: '#0f766e', dark: '#0d9488' }
const BORDER_RADIUS = 10
// Every modal is at least this wide on screens that fit it; antd shrinks them to the viewport on phones.
export const MODAL_WIDTH = 600

const buildTheme = (primaryColor: string): ThemeConfig => ({
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
        // The theme switch is the app's only Switch: a compact 20px track (antd's default is 22px, handle 18px).
        Switch: {
            trackHeight: 20,
            trackMinWidth: 40,
            handleSize: 16,
            innerMaxMargin: 22,
        },
    },
})

export const ANTD_THEMES: Record<ColorScheme, ThemeConfig> = {
    light: buildTheme(PRIMARY_COLORS.light),
    dark: buildTheme(PRIMARY_COLORS.dark),
}
