import { HEADING_FONT_STACK } from '@/fonts'
import { createStyles } from 'antd-style'

// One neutral drop shadow in both schemes, faint at rest and bolder while a file is dragged over. Dark uses fixed greys
// (a shadow has to be lighter than the near-black backdrop to show); light derives its tint from the text colour.
const FRAME_SHADOW_SHAPE = '0 6px 29px -2px'

// 400px: below it the settings panel and the drop zone stop fitting; the page scrolls rather than squeeze them.
const WORKSPACE_MIN_HEIGHT = '25rem'

// 500px: on a tall screen the square drop zone would otherwise grow past its column's width into a pillar.
const WORKSPACE_MAX_HEIGHT = '31.25rem'

const buildFrameShadow = (textColor: string, isDark: boolean) =>
    `${FRAME_SHADOW_SHAPE} ${isDark ? '#404040' : `color-mix(in srgb, ${textColor} 14%, transparent)`}`

const buildFrameDragShadow = (textColor: string, isDark: boolean) =>
    `${FRAME_SHADOW_SHAPE} ${isDark ? '#777' : `color-mix(in srgb, ${textColor} 30%, transparent)`}`

export const useStyles = createStyles(({ token, css, isDarkMode }) => ({
    /* Side by side, the page fills the screen without scrolling until the workspace would drop below
       WORKSPACE_MIN_HEIGHT; then the page grows and scrolls instead. A grid row (not a flex item) keeps the
       workspace's height definite under a min-height, so its columns can still size off 100%. */
    page: css`
        display: grid;
        grid-template-rows: auto minmax(${WORKSPACE_MIN_HEIGHT}, 1fr);
        min-height: calc(100dvh - var(--header-h) - var(--footer-h));
        padding: 2.5rem 0 0.5rem;

        @media (max-width: 991.98px) {
            display: flex;
            flex-direction: column;
            min-height: auto;
            flex: 1;
            padding: 1.5rem 0 2rem;
        }

        @media (max-height: 840px) {
            padding: 1rem 0;
        }

        @media (max-width: 767.98px) {
            padding: 2rem 0 1rem;
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
        font-size: clamp(2.1rem, 1.2rem + 5vw, 3.75rem);
        font-weight: 700;
        line-height: 1.15;
        letter-spacing: -0.02em;

        @media (max-height: 840px) {
            font-size: clamp(2.1rem, 1.2rem + 5vw, 3rem);
            margin-bottom: 0.75rem;
        }

        @media (max-width: 767.98px) {
            margin-bottom: 0;
        }
    `,

    heroAccent: css`
        color: ${token.colorPrimary};
    `,

    heroSubtitle: css`
        max-width: 34rem;
        margin: 0 auto;
        color: ${token.colorTextSecondary};
        font-size: clamp(1.05rem, 0.9rem + 1.2vw, 1.375rem);
        line-height: 1.5;

        /* On phones the headline alone introduces the page, so the upload box stays within the first screen. */
        @media (max-width: 767.98px) {
            display: none;
        }
    `,

    /* Capped, the workspace keeps to the top of its grid row, and the space left over goes below it. */
    workspace: css`
        display: flex;
        min-height: 0;
        max-height: ${WORKSPACE_MAX_HEIGHT};
        align-items: stretch;
        gap: 2.5rem;
        --col-w: min(35rem, 100%);
        /* A size container: its content mustn't size the grid row (the square drop zone and the settings panel take
           the row's height, not the other way round), and the player sizes off its height in cqh. */
        container-type: size;

        @media (max-width: 991.98px) {
            flex-direction: column;
            max-height: none;
            align-items: center;
            gap: 1.5rem;
            container-type: normal;
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
        border: 1.5px solid ${isDarkMode ? '#777' : token.colorPrimaryHover};
        border-radius: 0.5rem;
        /* Light: the palest tint that still reads as teal (at ~3% it reads as white). antd's colorPrimaryBg is a muted
           grey-teal for this primary, so the tint is mixed from the primary itself. */
        background: ${
            isDarkMode
                ? `color-mix(in srgb, ${token.colorPrimary} 6%, transparent)`
                : `color-mix(in srgb, ${token.colorPrimary} 8%, ${token.colorBgContainer})`
        };
        overflow: hidden;
        box-shadow: ${buildFrameShadow(token.colorText, isDarkMode)};
        transition: box-shadow 0.2s ease;

        /* Stacked, the drop zone is only as tall as its content plus even padding: a full-width square would be
           mostly empty space pushing everything below it off screen. */
        @media (max-width: 991.98px) {
            height: auto;
            width: min(var(--col-w), 100%);
            aspect-ratio: auto;

            /* antd pads the drag area through a three-class selector, so this needs as many to win. */
            .ant-upload.ant-upload-drag .ant-upload-btn {
                padding: 2rem 1rem;
            }
        }

        &[data-dragging='true'] {
            box-shadow: ${buildFrameDragShadow(token.colorText, isDarkMode)};
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

            /* Stacked, the frame takes the column's width rather than the player's: while the player loads, its
               placeholder has no video to give it a width. */
            @media (max-width: 991.98px) {
                width: min(var(--col-w), 100%);
            }
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

    reqButton: css`
        margin-top: 0.7rem;
    `,

    /* Touch screens can't drag files in, so the drop zone's wording switches to tapping there. */
    pointerOnly: css`
        @media (hover: none) {
            display: none;
        }
    `,

    touchOnly: css`
        display: none;

        @media (hover: none) {
            display: inline;
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

    /* The same Vidstack 16/9 override as the analysis player. A video hugged to its own width can't take a % height
       from its column, so it sizes off the workspace container's height instead. */
    player: css`
        height: 100cqh;
        max-height: 100cqh;
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

        /* Stacked, the player takes the video's own shape (--media-ratio), capped at 70vh, instead of a fixed-height
           black box. vertical-align drops the baseline gap under Vidstack's inline-flex player. */
        @media (max-width: 991.98px) {
            height: auto;
            max-height: 70vh;
            width: min(var(--col-w), 100%);
            aspect-ratio: var(--media-ratio, 16 / 9);
            vertical-align: top;
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
        border: none;
        background: linear-gradient(
            135deg,
            ${token.colorPrimary},
            color-mix(in srgb, ${token.colorPrimary} 55%, #38bdf8)
        );
        box-shadow: 0 8px 20px -8px ${token.colorPrimary};

        &:hover {
            box-shadow: 0 12px 28px -6px ${token.colorPrimary};
        }

        &:disabled {
            background: ${token.colorBgContainerDisabled};
            box-shadow: none;
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

    samplesPrompt: css`
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.4rem;
        width: min(70%, 18rem);
        /* A block inside antd's text-centred drag container, so it needs auto margins to centre. */
        margin: 0.75rem auto 0;
        color: ${token.colorTextSecondary};
        font-size: 0.85rem;
    `,

    samplesDivider: css`
        &.ant-divider {
            align-self: stretch;
            margin: 0 0 0.2rem;
            color: ${token.colorTextSecondary};
            font-size: 0.8rem;
        }
    `,

    sampleBadge: css`
        position: absolute;
        top: 0.6rem;
        left: 0.6rem;
        z-index: 3;
        max-width: calc(100% - 6rem);
        pointer-events: none;

        .ant-tag {
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            margin: 0;
        }
    `,

    sampleList: css`
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        max-height: min(70vh, 40rem);
        margin-top: 0.75rem;
        overflow-y: auto;
    `,

    sampleRow: css`
        display: flex;
        align-items: flex-start;
        gap: 1rem;

        /* Phones stack the preview above the text: side by side, a usable preview leaves no room for the info. */
        @media (max-width: 575.98px) {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
        }

        padding: 0.75rem;
        border: 1px solid ${token.colorBorderSecondary};
        border-radius: ${token.borderRadiusLG}px;
        cursor: pointer;
        transition: background 0.15s ease;

        &:hover {
            background: ${token.colorFillTertiary};
        }

        &:focus-visible {
            outline: 2px solid ${token.colorPrimary};
            outline-offset: 2px;
        }
    `,

    /* 16:9, the shape of most ads (vertical ones get side bars); the black letterbox is the video stage, not a theme
       colour. */
    sampleThumb: css`
        flex-shrink: 0;
        width: 15rem;
        aspect-ratio: 16 / 9;

        @media (max-width: 575.98px) {
            width: 100%;
        }
        border-radius: ${token.borderRadius}px;
        background: #000000;
        overflow: hidden;
        cursor: default;

        video {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
    `,

    sampleInfo: css`
        display: flex;
        flex: 1;
        flex-direction: column;
        gap: 0.4rem;
        min-width: 0;

        .ant-tag {
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
        }
    `,

    sampleHead: css`
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.75rem;
    `,

    sampleTitle: css`
        color: ${token.colorText};
        font-size: 1rem;
        font-weight: 600;
    `,

    sampleDuration: css`
        flex-shrink: 0;
        color: ${token.colorTextTertiary};
        font-size: 0.8rem;
        font-variant-numeric: tabular-nums;
    `,

    sampleDescription: css`
        margin: 0;
        color: ${token.colorTextSecondary};
        font-size: 0.875rem;
        line-height: 1.45;
    `,
}))
