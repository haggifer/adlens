import { createStyles } from 'antd-style'

export const useStyles = createStyles(({ token, css, isDarkMode }) => {
    // In dark mode the raw primary is too dark to read over the near-black base, so lift the glow toward white.
    const accent = isDarkMode
        ? `color-mix(in srgb, ${token.colorPrimary}, ${token.colorWhite} 35%)`
        : token.colorPrimary
    const tint = (pct: number) => `color-mix(in srgb, ${accent} ${pct}%, transparent)`

    return {
        ambient: css`
            position: fixed;
            inset: 0;
            z-index: 0;
            pointer-events: none;
            background:
                radial-gradient(85vw 55vh at 50% -8%, ${tint(24)}, transparent 62%),
                radial-gradient(60vw 40vh at 50% 108%, ${tint(12)}, transparent 60%), ${token.colorBgLayout};
            transition: background 0.3s ease;
        `,
    }
})
