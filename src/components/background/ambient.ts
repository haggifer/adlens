interface AmbientColors {
    colorPrimary: string
    colorWhite: string
    colorBgLayout: string
}

// The page background: the layout colour with a soft glow of the primary colour at the top and the bottom. Its sizes
// are viewport units, so any element painting it with `background-attachment: fixed` lines up with the page exactly.
export const ambientBackground = ({ colorPrimary, colorWhite, colorBgLayout }: AmbientColors, isDarkMode: boolean) => {
    // In dark mode the raw primary is too dark to read over the near-black base, so lift the glow toward white.
    const accent = isDarkMode ? `color-mix(in srgb, ${colorPrimary}, ${colorWhite} 35%)` : colorPrimary
    const tint = (pct: number) => `color-mix(in srgb, ${accent} ${pct}%, transparent)`

    return `radial-gradient(85vw 55vh at 50% -8%, ${tint(24)}, transparent 62%),
        radial-gradient(60vw 40vh at 50% 108%, ${tint(12)}, transparent 60%), ${colorBgLayout}`
}
