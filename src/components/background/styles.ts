import { createStyles } from 'antd-style'

const NOISE_SVG =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

export const useStyles = createStyles(({ token, css, isDarkMode }) => {
    const primary = token.colorPrimary
    const base = token.colorBgLayout
    // All accents are derived from the primary so every backdrop recolors with the picker. In dark mode
    // the raw primary is too dark to read over the near-black base, so lift the accent toward white first.
    const accent = isDarkMode ? `color-mix(in srgb, ${primary}, #fff 35%)` : primary
    const tint = (pct: number) => `color-mix(in srgb, ${accent} ${pct}%, transparent)`
    const edgeFade = 'radial-gradient(ellipse 92% 82% at 50% 38%, #000 34%, transparent 80%)'
    const gridAlpha = isDarkMode ? 11 : 8
    const dotAlpha = isDarkMode ? 18 : 12

    return {
        ambient: css`
            position: fixed;
            inset: 0;
            z-index: 0;
            pointer-events: none;
            background: ${base};
            transition: background 0.3s ease;

            &[data-ambient='aurora'] {
                background:
                    radial-gradient(55vw 55vh at 15% 12%, ${tint(22)}, transparent 60%),
                    radial-gradient(50vw 50vh at 85% 18%, ${tint(16)}, transparent 60%),
                    radial-gradient(65vw 65vh at 72% 88%, ${tint(14)}, transparent 65%), ${base};
                background-size: 160% 160%;
                animation: ambientDrift 26s ease-in-out infinite alternate;
            }

            &[data-ambient='mesh'] {
                background:
                    radial-gradient(40vw 40vw at 18% 22%, ${tint(30)}, transparent 55%),
                    radial-gradient(36vw 36vw at 82% 16%, ${tint(22)}, transparent 55%),
                    radial-gradient(44vw 44vw at 68% 82%, ${tint(20)}, transparent 58%),
                    radial-gradient(32vw 32vw at 28% 78%, ${tint(16)}, transparent 55%), ${base};
            }

            &[data-ambient='glow'] {
                background:
                    radial-gradient(85vw 55vh at 50% -8%, ${tint(24)}, transparent 62%),
                    radial-gradient(60vw 40vh at 50% 108%, ${tint(12)}, transparent 60%), ${base};
            }

            &[data-ambient='beams']::before {
                content: '';
                position: absolute;
                inset: 0;
                background: conic-gradient(
                    from 200deg at 78% -12%,
                    transparent 0deg,
                    ${tint(16)} 22deg,
                    transparent 62deg,
                    ${tint(10)} 100deg,
                    transparent 150deg
                );
            }

            &[data-ambient='grid']::before {
                content: '';
                position: absolute;
                inset: 0;
                background-image:
                    linear-gradient(to right, ${tint(gridAlpha)} 1px, transparent 1px),
                    linear-gradient(to bottom, ${tint(gridAlpha)} 1px, transparent 1px);
                background-size: 44px 44px;
                -webkit-mask-image: ${edgeFade};
                mask-image: ${edgeFade};
            }

            &[data-ambient='dots']::before {
                content: '';
                position: absolute;
                inset: 0;
                background-image: radial-gradient(${tint(dotAlpha)} 1.5px, transparent 1.7px);
                background-size: 24px 24px;
                -webkit-mask-image: ${edgeFade};
                mask-image: ${edgeFade};
            }

            &[data-ambient='grain'] {
                background: radial-gradient(80vw 50vh at 50% -10%, ${tint(12)}, transparent 60%), ${base};
            }

            &[data-ambient='grain']::before {
                content: '';
                position: absolute;
                inset: 0;
                background-image: ${NOISE_SVG};
                opacity: ${isDarkMode ? 0.07 : 0.045};
                mix-blend-mode: ${isDarkMode ? 'screen' : 'multiply'};
            }

            @keyframes ambientDrift {
                from {
                    background-position: 0% 50%;
                }
                to {
                    background-position: 100% 50%;
                }
            }
        `,
    }
})
