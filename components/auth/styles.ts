import { createStyles } from 'antd-style'
import { HEADING_FONT_STACK } from '@/lib/fonts'

const useStyles = createStyles(({ token, css }) => ({
    head: css`
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    `,

    title: css`
        font-family: ${HEADING_FONT_STACK};
        color: ${token.colorText};
        font-size: 1.3rem;
        font-weight: 600;
    `,

    subtitle: css`
        color: ${token.colorTextSecondary};
        font-size: 0.85rem;
        font-weight: 400;
    `,

    forgot: css`
        display: flex;
        justify-content: flex-end;
        margin-top: -0.5rem;
        margin-bottom: 0.5rem;
    `,

    switcher: css`
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.25rem;
        margin-top: 1rem;
        font-size: 0.9rem;
    `,

    gate: css`
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        min-height: calc(100dvh - var(--header-h) - var(--footer-h));
        padding: 3rem 0;
        text-align: center;
    `,

    gateTitle: css`
        margin: 0;
        font-family: ${HEADING_FONT_STACK};
        color: ${token.colorTextHeading};
        font-size: clamp(1.5rem, 3vw, 2rem);
        font-weight: 700;
    `,

    gateText: css`
        margin: 0;
        color: ${token.colorTextSecondary};
        font-size: 1rem;
    `,
}))

export default useStyles
