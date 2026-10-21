import { createStyles } from 'antd-style'

export const useStyles = createStyles(({ token, css }) => ({
    page: css`
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        flex: 1;
        padding: 2rem 0;

        /* The top of the Examples page (analysis styles' page), so every page's title starts at the same height. */
        @media (max-width: 991.98px) {
            padding-top: 1.5rem;
        }
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

    tags: css`
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;

        .ant-tag {
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
