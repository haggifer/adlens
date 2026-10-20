interface AmbientColors {
    colorPrimary: string
    colorWhite: string
    colorBgLayout: string
}

// The page background: the layout colour with a soft glow of the primary colour at the top and the bottom. The top glow
// is placed from the header's bottom edge (--header-h), so it starts under the plain header rather than behind it. Its
// sizes are viewport units, so any element painting it with `background-attachment: fixed` lines up with the page
// exactly. The top glow's radii are CSS variables (globals.css), so narrow screens get a wider, lower one.
export const ambientBackground = ({ colorPrimary, colorWhite, colorBgLayout }: AmbientColors, isDarkMode: boolean) => {
    // In dark mode the raw primary is too dark to read over the near-black base, so lift the glow toward white.
    const accent = isDarkMode ? `color-mix(in srgb, ${colorPrimary}, ${colorWhite} 35%)` : colorPrimary
    const tint = (pct: number) => `color-mix(in srgb, ${accent} ${pct}%, transparent)`

    return `radial-gradient(var(--ambient-glow-rx) var(--ambient-glow-ry) at 50% calc(var(--header-h) - 8vh), ${tint(24)}, transparent 62%),
        radial-gradient(60vw 40vh at 50% 108%, ${tint(12)}, transparent 60%), ${colorBgLayout}`
}

// For an opaque bar that content scrolls under (the legal pages' Back bar): the page's own background
// pinned to the viewport, so the bar can't be told apart from the page. iOS Safari ignores a fixed attachment and would
// stretch the glow over the bar alone, so there it's plain.
export const pinnedAmbientBackground = (colors: AmbientColors, isDarkMode: boolean) => `
    background: ${ambientBackground(colors, isDarkMode)};
    background-attachment: fixed;

    @supports (-webkit-touch-callout: none) {
        background: ${colors.colorBgLayout};
    }
`
