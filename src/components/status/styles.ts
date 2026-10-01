import { createStyles } from 'antd-style'

export const useStyles = createStyles(({ token, css }) => ({
    page: css`
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 1;
        padding: 2.5rem 0;
    `,

    card: css`
        width: min(32rem, 100%);
        border: 1px solid ${token.colorBorderSecondary};
        border-radius: ${token.borderRadiusLG}px;
        background: ${token.colorBgContainer};
        box-shadow: ${token.boxShadowTertiary};
    `,
}))
