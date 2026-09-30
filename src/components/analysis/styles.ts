import { createStyles, keyframes } from 'antd-style'
import { HEADING_FONT_STACK } from '@/fonts'

// One cycle per icon: in, hold, out. Its duration is set to the icon interval by AnalysisAnimation.
const ICON_FADE = keyframes`
    0% {
        opacity: 0;
    }
    25%,
    75% {
        opacity: 1;
    }
    100% {
        opacity: 0;
    }
`

export const useStyles = createStyles(({ token, css }) => ({
    page: css`
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        height: calc(100dvh - var(--header-h) - var(--footer-h));
        padding: 2rem 0 0.5rem;

        @media (max-width: 991.98px) {
            height: auto;
            flex: 1;
            padding: 1.5rem 0 2rem;
        }
    `,

    pageHeader: css`
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1rem;
    `,

    pageTitle: css`
        margin: 0;
        font-family: ${HEADING_FONT_STACK};
        color: ${token.colorTextHeading};
        font-size: clamp(1.25rem, 1rem + 1.5vw, 1.6rem);
        font-weight: 700;
        letter-spacing: -0.01em;
        overflow-wrap: anywhere;
    `,

    pageMeta: css`
        margin: 0;
        color: ${token.colorTextSecondary};
        font-size: 0.9rem;
    `,

    workspace: css`
        display: flex;
        flex: 1;
        min-height: 0;
        gap: 2rem;

        @media (max-width: 991.98px) {
            flex-direction: column;
        }
    `,

    stage: css`
        display: flex;
        flex: 1;
        min-width: 0;
        align-items: center;
        justify-content: center;
        border-radius: 0.5rem;
        background: #000000;
        overflow: hidden;
        scroll-margin-top: calc(var(--header-h) + 0.75rem);

        /* Stacked, the stage takes the video's own shape (--media-ratio, measured by the API) instead of a fixed
           box, capped so a portrait video still leaves the results in view. */
        @media (max-width: 991.98px) {
            flex: none;
            aspect-ratio: var(--media-ratio, 16 / 9);
            max-height: 70vh;
        }
    `,

    /* Vidstack forces the inner <video> to 16/9, shrinking non-16/9 clips; the override makes the media fill the
       player instead, letterboxed on the black stage. */
    player: css`
        width: 100%;
        height: 100%;
        background: #000000;

        video {
            width: 100%;
            height: 100%;
            aspect-ratio: auto;
            object-fit: contain;
        }
    `,

    panel: css`
        display: flex;
        flex-direction: column;
        gap: 1rem;
        /* Side by side on small laptops and landscape tablets, the panel leaves the video at least half the row. */
        width: min(35rem, 48%);
        flex-shrink: 0;
        padding: 1.5rem;
        border: 1px solid ${token.colorBorderSecondary};
        border-radius: ${token.borderRadiusLG}px;
        background: ${token.colorBgContainer};
        box-shadow: ${token.boxShadowTertiary};

        @media (max-width: 991.98px) {
            width: 100%;
        }
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

    // The running step's icon, switching and fading in its own colour.
    stepIcon: css`
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.5rem;
        height: 1.5rem;
        font-size: 1rem;
        animation-name: ${ICON_FADE};
        animation-timing-function: ease-in-out;

        @media (prefers-reduced-motion: reduce) {
            animation: none;
        }
    `,

    hint: css`
        margin: 0;
        color: ${token.colorTextSecondary};
        font-size: 0.85rem;
    `,

    resultsScroll: css`
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-inline: -0.5rem;
        padding-inline: 0.5rem;
    `,

    summaryRow: css`
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    `,

    sectionLabel: css`
        margin: 0.75rem 0 0;
        color: ${token.colorTextHeading};
        font-size: 1rem;
        font-weight: 600;
    `,

    findingCard: css`
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        padding: 0.75rem;
        border: 1px solid ${token.colorBorderSecondary};
        border-radius: ${token.borderRadius}px;
        background: ${token.colorFillQuaternary};
    `,

    findingHead: css`
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.4rem;
    `,

    findingTopic: css`
        font-weight: 600;
        color: ${token.colorText};
        font-size: 0.9rem;
    `,

    findingEvidence: css`
        margin: 0;
        color: ${token.colorText};
        font-size: 0.9rem;
    `,

    findingFooter: css`
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.75rem;
        color: ${token.colorTextSecondary};
        font-size: 0.8rem;

        @media (max-width: 767.98px) {
            font-size: 0.85rem;
        }
    `,

    timeButton: css`
        height: auto;
        padding: 0;
        font-size: 0.8rem;

        @media (max-width: 767.98px) {
            padding: 0.25rem 0;
            font-size: 0.875rem;
        }
        font-variant-numeric: tabular-nums;

        @media (pointer: coarse) {
            min-height: 2.75rem;
        }
    `,

    sourceLink: css`
        color: ${token.colorPrimary};
        font-size: 0.8rem;

        @media (max-width: 767.98px) {
            font-size: 0.875rem;
        }

        @media (pointer: coarse) {
            display: inline-flex;
            align-items: center;
            min-height: 2.75rem;
        }
    `,

    transcriptText: css`
        margin: 0;
        white-space: pre-wrap;
        color: ${token.colorTextSecondary};
        font-size: 0.85rem;
        line-height: 1.5;
    `,
}))
