import { HEADING_FONT_STACK } from '@/fonts'
import { createStyles } from 'antd-style'

export const useStyles = createStyles(({ token, css }) => ({
    // Only as wide as its tabs, and without antd's grey track: the page's own background shows through, so no band
    // runs across the page. Never wider than the column either: the labels come from the demos, so a longer set
    // scrolls inside the tabs rather than past the page's edge; on a phone the tighter padding fits today's three.
    tabs: css`
        align-self: flex-start;
        max-width: 100%;
        overflow-x: auto;

        &.ant-segmented {
            background: transparent;
        }

        @media (max-width: 575.98px) {
            .ant-segmented-item-label {
                padding-inline: 0.5rem;
            }
        }
    `,

    summary: css`
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        max-width: 60rem;
    `,

    summaryTitle: css`
        margin: 0;
        font-family: ${HEADING_FONT_STACK};
        color: ${token.colorTextHeading};
        font-size: clamp(1.1rem, 0.95rem + 0.8vw, 1.35rem);
        font-weight: 700;
    `,

    summaryText: css`
        margin: 0;
        color: ${token.colorText};
        line-height: 1.55;
    `,
}))
