import { createStyles } from 'antd-style'
import { ambientBackground } from './ambient'

export const useStyles = createStyles(({ token, css, isDarkMode }) => ({
    ambient: css`
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        background: ${ambientBackground(token, isDarkMode)};
        transition: background 0.3s ease;
    `,
}))
