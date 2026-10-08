import { HEADING_FONT_STACK } from '@/fonts'
import { createStyles } from 'antd-style'

export const useStyles = createStyles(({ token, css }) => ({
    header: css`
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1rem;
    `,

    // Only as wide as its tabs, and without antd's grey track: the page's own background shows through, so no band
    // runs across the page.
    tabs: css`
        align-self: flex-start;

        &.ant-segmented {
            background: transparent;
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
