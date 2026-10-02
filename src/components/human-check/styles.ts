import { createStyles } from 'antd-style'

export const useStyles = createStyles(({ token, css }) => ({
    // Out of the parent's flex flow while there's nothing to show, so it doesn't add a second gap; still rendered, so
    // Cloudflare can run the invisible check.
    idle: css`
        position: absolute;
    `,
    hint: css`
        color: ${token.colorTextSecondary};
        font-size: 0.85rem;
    `,
}))
