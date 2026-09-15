import { createStyles } from 'antd-style'

// The dev panel is deliberately theme-independent (neutral chrome that sits apart from the
// previewed design), so its colors are fixed here rather than pulled from the theme tokens.
export const useStyles = createStyles(({ css }) => ({
    devBar: css`
        position: sticky;
        top: 0;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 0.85rem;
        width: 232px;
        flex-shrink: 0;
        height: 100vh;
        padding: 1rem 0.85rem;
        overflow-y: auto;
        background: #0d0f14;
        color: #e5e7eb;
        font-size: 0.8rem;
        border-right: 1px solid rgba(255, 255, 255, 0.08);

        .ant-select {
            width: 100%;
        }

        @media (max-width: 991.98px) {
            position: static;
            flex-direction: row;
            flex-wrap: wrap;
            align-items: center;
            gap: 0.5rem 1rem;
            width: auto;
            height: auto;
            padding: 0.5rem 1rem;
            overflow: visible;
            border-right: none;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);

            .ant-select {
                width: auto;
            }
        }
    `,

    brand: css`
        font-weight: 600;
        color: #ffffff;
    `,

    control: css`
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 0.3rem;

        @media (max-width: 991.98px) {
            flex-direction: row;
            align-items: center;
            gap: 0.4rem;
        }
    `,

    controlPush: css`
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 0.4rem;
        margin-top: auto;

        @media (max-width: 991.98px) {
            margin-top: 0;
        }
    `,

    label: css`
        color: #9aa0aa;
    `,
}))
