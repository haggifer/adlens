import { HEADING_FONT_STACK } from '@/fonts'
import { createStyles } from 'antd-style'

export const useStyles = createStyles(({ token, css }) => ({
    // min-width: 0 lets the tables scroll inside their own boxes instead of widening the page on a phone.
    page: css`
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        flex: 1;
        min-width: 0;
        padding: 2rem 0;
    `,

    pageTitle: css`
        margin: 0;
        font-family: ${HEADING_FONT_STACK};
        color: ${token.colorTextHeading};
        font-size: clamp(1.75rem, 4vw, 2.25rem);
        font-weight: 700;
        letter-spacing: -0.02em;
    `,
}))
