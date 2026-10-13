import { HEADING_FONT_STACK } from '@/fonts'
import { createStyles } from 'antd-style'

export const useStyles = createStyles(({ token, css }) => ({
    title: css`
        font-family: ${HEADING_FONT_STACK};
        color: ${token.colorText};
        font-size: 1.3rem;
        font-weight: 600;
    `,

    page: css`
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        flex: 1;
        padding: 2rem 0;
    `,

    titleRow: css`
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
    `,

    pageTitle: css`
        margin: 0;
        font-family: ${HEADING_FONT_STACK};
        color: ${token.colorTextHeading};
        font-size: clamp(1.75rem, 4vw, 2.25rem);
        font-weight: 700;
        letter-spacing: -0.02em;
    `,

    gate: css`
        display: flex;
        justify-content: center;
        align-items: center;
        flex: 1;
        padding: 4rem 0;
    `,

    nameCell: css`
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        min-width: 0;
    `,

    name: css`
        color: ${token.colorText};
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    `,

    compactMeta: css`
        display: none;
        color: ${token.colorTextSecondary};
        font-size: 0.8rem;

        @media (max-width: 575.98px) {
            display: block;
        }
    `,
}))
