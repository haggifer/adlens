import { theme as antdTheme, ThemeConfig } from 'antd'
import { BODY_FONT_STACK } from '@/lib/fonts'
import { ColorScheme } from '@/lib/design/types'

// Locked brand seed. The whole palette (backgrounds, text, borders, hovers) is generated from this
// single primary by antd's light/dark algorithm — components read the resulting tokens directly.
export const PRIMARY_COLOR = '#7c3aed'
export const BORDER_RADIUS = 10

export const buildAntdTheme = (scheme: ColorScheme, primaryColor: string = PRIMARY_COLOR): ThemeConfig => ({
    algorithm: scheme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
        colorPrimary: primaryColor,
        colorInfo: primaryColor,
        colorLink: primaryColor,
        borderRadius: BORDER_RADIUS,
        fontFamily: BODY_FONT_STACK,
    },
})
