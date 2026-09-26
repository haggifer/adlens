import { createStyles } from 'antd-style'

export const useStyles = createStyles(({ token, css }) => ({
    field: css`
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        margin-bottom: 1rem;
    `,

    fieldLabel: css`
        color: ${token.colorText};
        font-size: 0.9rem;
        font-weight: 500;
    `,

    fieldHint: css`
        margin: 0;
        color: ${token.colorTextSecondary};
        font-size: 0.8rem;
    `,

    fieldError: css`
        margin: 0;
        color: ${token.colorError};
        font-size: 0.8rem;
    `,
}))
