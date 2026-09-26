import { createStyles } from 'antd-style'
import { HEADING_FONT_STACK } from '@/fonts'

export const useStyles = createStyles(({ token, css }) => ({
    page: css`
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        flex: 1;
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

    videoCell: css`
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        min-width: 0;
    `,

    videoName: css`
        display: flex;
        align-items: center;
        gap: 0.5rem;
        min-width: 0;

        .ant-tag {
            flex-shrink: 0;
            margin: 0;
        }
    `,

    videoLink: css`
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    `,

    compactMeta: css`
        display: none;
        align-items: center;
        gap: 0.5rem;
        color: ${token.colorTextSecondary};
        font-size: 0.8rem;

        .ant-tag {
            margin: 0;
        }

        @media (max-width: 575.98px) {
            display: flex;
        }
    `,
}))
