import { ThemeConfig } from 'antd'
import { BODY_FONT_STACK } from '@/lib/fonts'

// Locked brand seed. The whole palette (backgrounds, text, borders, hovers) is generated from this
// single primary by antd's light/dark algorithm — components read the resulting tokens directly.
// The light/dark algorithm itself is applied by antd-style's ThemeProvider via its `appearance` prop
// (which also drives createStyles' `isDarkMode`), so this config carries only the seed token.
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
        // antd gives every button a subtle bottom drop shadow by default (these component tokens); we turn
        // it off app-wide for a flatter look. Remove this block to restore antd's default button shadows.
        Button: {
            primaryShadow: 'none',
            defaultShadow: 'none',
            dangerShadow: 'none',
        },
    },
})
