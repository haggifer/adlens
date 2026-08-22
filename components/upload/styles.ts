import { createStyles } from 'antd-style'
import { HEADING_FONT_STACK } from '@/lib/fonts'

// Dark uses one neutral drop shadow — the layered light stack is invisible on the near-black backdrop.
const buildFrameShadow = (primary: string, isDark: boolean) =>
    isDark
        ? `0 6px 29px -2px #404040`
        : `0 6px 29px -2px rgba(0, 0, 0, 0.3),
           0 1px 2px 0 rgba(0, 0, 0, 0.05),
           0 1px 6px -1px rgba(0, 0, 0, 0.03),
           0 2px 4px 0 rgba(0, 0, 0, 0.03),
           0 0 0 1px ${primary},
           0 0 16px -12px ${primary}`

const buildFrameDragShadow = (primaryHover: string, isDark: boolean) =>
    isDark ? `0 6px 29px -2px #777` : `0 0 0 1px ${primaryHover}, 0 0 44px -2px ${primaryHover}`

const useStyles = createStyles(({ token, css, isDarkMode }) => ({
    page: css`
        display: flex;
        flex-direction: column;
        height: calc(100dvh - var(--header-h) - var(--footer-h));
        padding: 2.5rem 0 0.5rem;

        @media (max-width: 991.98px) {
            height: auto;
            min-height: calc(100dvh - var(--header-h) - var(--footer-h));
            padding: 1.5rem 0 2rem;
        }

        @media (max-height: 840px) {
            padding: 1rem 0;
        }
    `,

    hero: css`
        max-width: 46rem;
        margin: 0 auto 2rem;
        text-align: center;

        @media (max-width: 991.98px) {
            margin-bottom: 1.5rem;
        }

        @media (max-height: 840px) {
            margin-bottom: 1.25rem;
        }
    `,

    heroTitle: css`
        margin: 0 0 1.25rem;
        font-family: ${HEADING_FONT_STACK};
        color: ${token.colorTextHeading};
        font-size: 3.75rem;
        font-weight: 700;
        line-height: 1.15;
        letter-spacing: -0.02em;

        @media (max-height: 840px) {
            font-size: 3rem;
            margin-bottom: 0.75rem;
        }
    `,

    heroAccent: css`
        color: ${token.colorPrimary};
    `,

    heroSubtitle: css`
        max-width: 34rem;
        margin: 0 auto;
        color: ${token.colorTextSecondary};
        font-size: 1.375rem;
        line-height: 1.5;
    `,

    workspace: css`
        display: flex;
        flex: 1;
        min-height: 0;
        align-items: stretch;
        gap: 2.5rem;
        --col-w: min(35rem, 100%);

        @media (max-width: 991.98px) {
            flex-direction: column;
            align-items: center;
            gap: 1.5rem;
        }
    `,

    left: css`
        display: flex;
        flex: 1;
        min-width: 0;
        align-items: center;
        justify-content: flex-end;

        @media (max-width: 991.98px) {
            flex: none;
            width: 100%;
            justify-content: center;
        }
    `,

    right: css`
        display: flex;
        flex: 1;
        min-width: 0;
        align-items: center;
        justify-content: flex-start;

        @media (max-width: 991.98px) {
            flex: none;
            width: 100%;
            justify-content: center;
        }
    `,

    frame: css`
        position: relative;
        height: 100%;
        aspect-ratio: 1 / 1;
        width: auto;
        max-width: var(--col-w);
        flex-shrink: 0;
        border: 1.5px solid ${token.colorBorder};
        border-radius: 0.5rem;
        background: color-mix(in srgb, ${token.colorPrimary} 6%, transparent);
        overflow: hidden;
        box-shadow: ${buildFrameShadow(token.colorPrimary, isDarkMode)};
        transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;

        /* Columns don't stretch when stacked, so size the square by width on mobile instead of height. */
        @media (max-width: 991.98px) {
            height: auto;
            width: min(var(--col-w), 100%);
        }

        &[data-dragging='true'] {
            border-color: ${isDarkMode ? '#777' : token.colorPrimaryHover};
            box-shadow: ${buildFrameDragShadow(token.colorPrimaryHover, isDarkMode)};
        }

        &[data-video='true'] {
            height: auto;
            width: fit-content;
            max-width: var(--col-w);
            max-height: 100%;
            aspect-ratio: auto;
            /* border: none, not transparent: a transparent 1.5px border with background-clip: border-box
               shows the frame background as a hairline around the video. */
            border: none;
            background: #000000;
        }

        &[data-video='true']:hover [data-overlay] {
            opacity: 1;
        }

        .ant-upload.ant-upload-drag {
            height: 100%;
            background: transparent;
            border: none;
            border-radius: 0;
        }

        .ant-upload-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            height: 100%;
        }
    `,

    dragger: css`
        height: 100%;
    `,

    reqTag: css`
        margin-top: 0.7rem;
        padding: 0.2rem 0.5rem;
        border-color: currentColor;
        font-size: 0.78rem;
        line-height: 1;
        cursor: help;
        transition: color 0.2s ease;

        .anticon {
            margin: 0;
            font-size: 0.9rem;
        }
    `,

    reqKey: css`
        font-weight: 600;
    `,

    icon: css`
        color: ${token.colorPrimary};
        font-size: 45px;
        line-height: 1;
    `,

    title: css`
        font-family: ${HEADING_FONT_STACK};
        color: ${token.colorText};
        font-size: 1.1rem;
        font-weight: 600;
    `,

    hint: css`
        color: ${token.colorTextSecondary};
        font-size: 0.85rem;
    `,

    /* Vidstack forces the inner <video> to 16/9, shrinking non-16/9 clips; the override below makes the
       media fill the player instead. --stage-h mirrors the flex column height (set by AdWorkspace). */
    player: css`
        height: var(--stage-h, 60vh);
        max-height: var(--stage-h, 60vh);
        max-width: var(--col-w);
        width: auto;
        border-radius: 0.5rem;
        overflow: hidden;
        background: #000000;

        video {
            width: 100%;
            height: 100%;
            aspect-ratio: auto;
            object-fit: contain;
        }

        @media (max-width: 991.98px) {
            height: 70vh;
            width: min(var(--col-w), 100%);
        }
    `,

    overlay: css`
        position: absolute;
        top: 0.6rem;
        right: 0.6rem;
        z-index: 3;
        display: flex;
        gap: 0.4rem;
        opacity: 0;
        transition: opacity 0.2s ease;

        /* The video stage is always black regardless of app theme, so these use fixed white values —
           theme tokens would render dark-on-black in light mode. */
        .ant-btn {
            color: #ffffff;
            background: transparent;
            border: none;
            transition: background 0.2s ease;
        }

        .ant-btn:hover {
            color: #ffffff !important;
            background: rgba(255, 255, 255, 0.2) !important;
        }

        @media (hover: none) {
            opacity: 1;
        }
    `,

    panel: css`
        width: var(--col-w);
        max-width: 100%;
        max-height: 100%;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1.5rem;
        border: 1px solid ${token.colorBorderSecondary};
        border-radius: ${token.borderRadiusLG}px;
        background: ${token.colorBgContainer};
        box-shadow: ${token.boxShadowTertiary};
        transition:
            background 0.3s ease,
            border-color 0.3s ease;
    `,

    settingsPanel: css`
        height: 100%;
    `,

    panelTitle: css`
        flex-shrink: 0;
        margin: 0;
        font-family: ${HEADING_FONT_STACK};
        color: ${token.colorText};
        font-size: 1.35rem;
        font-weight: 700;
        letter-spacing: -0.01em;
    `,

    settingsScroll: css`
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        /* overflow-y: auto also clips horizontally, cutting input focus rings at the sides; the
           negative-margin + equal-padding pair gives them room back. */
        margin-inline: -0.5rem;
        padding-inline: 0.5rem;
    `,

    advancedToggle: css`
        margin-top: 0.15rem;
        flex-shrink: 0;
    `,

    runButton: css`
        flex-shrink: 0;
        height: auto;
        min-height: 2.75rem;
        padding-block: 0.6rem;
        font-weight: 600;
        transition:
            transform 0.15s ease,
            box-shadow 0.2s ease,
            background 0.2s ease;

        &[data-accent='gradient'] {
            border: none;
            background: linear-gradient(
                135deg,
                ${token.colorPrimary},
                color-mix(in srgb, ${token.colorPrimary} 55%, #38bdf8)
            );
            box-shadow: 0 8px 20px -8px ${token.colorPrimary};
        }
        &[data-accent='gradient']:hover {
            box-shadow: 0 12px 28px -6px ${token.colorPrimary};
        }

        &[data-accent='glow'] {
            box-shadow:
                0 0 0 1px ${token.colorPrimary},
                0 0 20px -4px ${token.colorPrimary};
            animation: runPulse 2.6s ease-in-out infinite;
        }
        &[data-accent='glow']:hover {
            animation: none;
            box-shadow:
                0 0 0 1px ${token.colorPrimary},
                0 0 30px 0 ${token.colorPrimary};
        }

        &[data-accent='shine'] {
            position: relative;
            overflow: hidden;
            border: none;
            background: linear-gradient(
                135deg,
                ${token.colorPrimary},
                color-mix(in srgb, ${token.colorPrimary} 55%, #38bdf8)
            );
            box-shadow: 0 8px 20px -8px ${token.colorPrimary};
        }
        &[data-accent='shine']::after {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(120deg, transparent 35%, rgba(255, 255, 255, 0.38) 50%, transparent 65%);
            transform: translateX(-130%);
            animation: runShine 3.2s ease-in-out infinite;
        }

        @keyframes runPulse {
            0%,
            100% {
                box-shadow:
                    0 0 0 1px ${token.colorPrimary},
                    0 0 14px -4px ${token.colorPrimary};
            }
            50% {
                box-shadow:
                    0 0 0 1px ${token.colorPrimary},
                    0 0 26px 0 ${token.colorPrimary};
            }
        }
        @keyframes runShine {
            0% {
                transform: translateX(-130%);
            }
            55%,
            100% {
                transform: translateX(130%);
            }
        }
    `,

    featureList: css`
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
        margin: 0.25rem 0 0;
        padding: 0;
        list-style: none;
    `,

    featureItem: css`
        display: flex;
        align-items: flex-start;
        gap: 0.6rem;
        color: ${token.colorTextSecondary};
        font-size: 0.95rem;

        .anticon {
            margin-top: 0.2rem;
            color: ${token.colorPrimary};
        }
    `,

    field: css`
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
    `,

    fieldLabel: css`
        color: ${token.colorText};
        font-size: 0.85rem;
        font-weight: 500;
    `,
}))

export default useStyles
