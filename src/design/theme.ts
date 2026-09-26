import { ThemeConfig } from 'antd'
import { BODY_FONT_STACK } from '@/fonts'

// Seed-only theme: antd derives the whole palette from this one primary. The light/dark algorithm is
// intentionally not set here — antd-style's ThemeProvider applies it via `appearance` (see Providers.tsx).
export const PRIMARY_COLOR = '#0d9488'
export const BORDER_RADIUS = 10
// Every modal is at least this wide on screens that fit it; antd shrinks them to the viewport on phones.
export const MODAL_WIDTH = 600

export const ANTD_THEME: ThemeConfig = {
    token: {
        colorPrimary: PRIMARY_COLOR,
        colorInfo: PRIMARY_COLOR,
        colorLink: PRIMARY_COLOR,
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
}
