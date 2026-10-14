import { HEADING_FONT_STACK } from '@/fonts'
import { createStyles } from 'antd-style'

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

    row: css`
        cursor: pointer;
    `,

    videoLink: css`
        color: ${token.colorText};
        font-weight: 500;
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

    compactPreset: css`
        display: none;
        min-width: 0;

        .ant-tag {
            max-width: 100%;
            margin: 0;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        @media (max-width: 991.98px) {
            display: flex;
        }
    `,
}))
