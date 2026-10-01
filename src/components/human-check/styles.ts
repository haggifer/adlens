import { createStyles } from 'antd-style'

export const useStyles = createStyles(({ token, css }) => ({
    hint: css`
        color: ${token.colorTextSecondary};
        font-size: 0.85rem;
    `,
}))
