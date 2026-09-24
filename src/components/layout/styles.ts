import { createStyles } from 'antd-style'
import { HEADING_FONT_STACK } from '@/fonts'

export const useStyles = createStyles(({ token, css }) => ({
    appShell: css`
        --header-h: 4rem;
        --footer-h: 3.5rem;
        position: relative;
        z-index: 1;
        flex: 1;
        min-width: 0;
        min-height: 100vh;

        @media (max-width: 991.98px) {
            --header-h: 3.5rem;
        }
    `,

    appMain: css`
        max-width: 1120px;
        margin: 0 auto;
        padding: 0 1.5rem;

        @media (max-width: 991.98px) {
            padding: 0 1rem;
        }
    `,

    header: css`
        position: sticky;
        top: 0;
        z-index: 10;
        background: color-mix(in srgb, ${token.colorBgLayout} 72%, transparent);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        transition: background 0.3s ease;
    `,

    headerInner: css`
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1.5rem;
        max-width: 1120px;
        height: 64px;
        margin: 0 auto;
        padding: 0 1.5rem;

        @media (max-width: 991.98px) {
            height: 56px;
            padding: 0 1rem;
        }
    `,

    headerLeft: css`
        display: flex;
        align-items: flex-end;
        gap: 1.75rem;
    `,

    logoLink: css`
        display: inline-flex;
    `,

    nav: css`
        display: flex;
        align-items: center;
        gap: 1.25rem;
        margin-bottom: 3px;
    `,

    navLink: css`
        color: ${token.colorTextSecondary};
        font-size: 0.95rem;
        font-weight: 500;
        line-height: 1;
        transition: color 0.15s ease;

        &:hover,
        &[data-active='true'] {
            color: ${token.colorText};
        }
    `,

    headerRight: css`
        display: flex;
        align-items: center;
        gap: 0.75rem;
    `,

    headerDivider: css`
        height: 1.4rem;
        margin: 0;
    `,

    accountAvatar: css`
        display: inline-flex;
        padding: 0;
        border: none;
        background: none;
        cursor: pointer;
    `,

    stubPage: css`
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        min-height: calc(100dvh - var(--header-h) - var(--footer-h));
        padding: 3rem 0;
        text-align: center;
    `,

    stubTitle: css`
        font-family: ${HEADING_FONT_STACK};
        color: ${token.colorTextHeading};
        font-size: clamp(1.75rem, 4vw, 2.5rem);
        font-weight: 700;
        letter-spacing: -0.02em;
    `,

    stubSubtitle: css`
        color: ${token.colorTextSecondary};
        font-size: 1.05rem;
    `,

    footer: css`
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        min-height: var(--footer-h);
        padding: 0.75rem 1.5rem;
        font-size: 0.85rem;
    `,

    footerLink: css`
        padding: 0;
        border: none;
        background: none;
        color: ${token.colorTextSecondary};
        font: inherit;
        cursor: pointer;
        transition: color 0.15s ease;

        &:hover {
            color: ${token.colorText};
        }
    `,

    footerSep: css`
        color: ${token.colorTextTertiary};
    `,

    footerCopy: css`
        color: ${token.colorTextTertiary};
    `,
}))
