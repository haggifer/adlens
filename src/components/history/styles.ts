import { createStyles } from 'antd-style'
import { HEADING_FONT_STACK } from '@/fonts'

export const useStyles = createStyles(({ token, css }) => ({
    page: css`
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        min-height: calc(100dvh - var(--header-h) - var(--footer-h));
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
