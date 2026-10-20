import { LOGO_FONT_STACK } from '@/fonts'
import { createStyles } from 'antd-style'

export const useStyles = createStyles(({ token, css }) => ({
    logo: css`
        display: inline-flex;
        align-items: flex-start;
        gap: 0.25rem;
        padding-bottom: 0.5rem;
        color: ${token.colorPrimary};

        /* The lift lines the logo up with the desktop nav; behind the burger menu there is no nav to line up with. */
        @media (max-width: 991.98px) {
            padding-bottom: 0;
        }
    `,

    logoMark: css`
        width: 1.6rem;
        height: 1.6rem;
        flex-shrink: 0;
        display: block;
        background-color: ${token.colorPrimary};
        -webkit-mask: url(/logo.svg) center / contain no-repeat;
        mask: url(/logo.svg) center / contain no-repeat;
    `,

    logoText: css`
        font-family: ${LOGO_FONT_STACK};
        font-size: 1.35rem;
        font-weight: 700;
        line-height: 1;
        letter-spacing: -0.01em;
        margin-top: 2px;
    `,
}))
