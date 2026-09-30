import { createStyles } from 'antd-style'

export const useStyles = createStyles(({ token, css }) => ({
    appShell: css`
        --header-h: 4rem;
        --footer-h: 3.5rem;
        position: relative;
        z-index: 1;
        /* A full-height column: main takes whatever the header and footer leave, so pages fill the screen by growing
           into it rather than by subtracting a footer height that varies (it wraps to two lines on phones). */
        display: flex;
        flex-direction: column;
        min-width: 0;
        min-height: 100dvh;

        @media (max-width: 991.98px) {
            --header-h: 3.5rem;
        }

        /* Touch screens get 44px footer links. Only the side-by-side desktop layouts still size against this value. */
        @media (pointer: coarse) {
            --footer-h: 4.25rem;
        }
    `,

    appMain: css`
        display: flex;
        flex: 1;
        flex-direction: column;
        width: 100%;
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

    // Centred like the right side, so the nav links sit level with the quota label and the buttons across the bar.
    headerLeft: css`
        display: flex;
        align-items: center;
        gap: 1.75rem;
    `,

    logoLink: css`
        display: inline-flex;
    `,

    nav: css`
        display: flex;
        align-items: center;
        gap: 1.25rem;
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

        @media (max-width: 767.98px) {
            gap: 1rem;
        }
    `,

    headerGroup: css`
        display: inline-flex;
        align-items: center;
        gap: 0.75rem;
    `,

    desktopOnly: css`
        @media (max-width: 767.98px) {
            display: none;
        }
    `,

    mobileOnly: css`
        display: none;

        @media (max-width: 767.98px) {
            display: inline-flex;
        }
    `,

    menuButton: css`
        width: 2.75rem;
        height: 2.75rem;
        font-size: 1.25rem;
    `,

    drawerBody: css`
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    `,

    drawerUser: css`
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        padding: 0 0.75rem 0.75rem;
        border-bottom: 1px solid ${token.colorBorderSecondary};
        overflow-wrap: anywhere;
    `,

    drawerUserName: css`
        color: ${token.colorText};
        font-weight: 600;
    `,

    drawerUserEmail: css`
        color: ${token.colorTextSecondary};
        font-size: 0.875rem;
    `,

    drawerUserQuota: css`
        margin-top: 0.35rem;
        color: ${token.colorTextSecondary};
        font-size: 0.875rem;
    `,

    drawerNav: css`
        display: flex;
        flex-direction: column;
    `,

    drawerItem: css`
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        min-height: 2.75rem;
        padding: 0 0.75rem;
        border: none;
        border-radius: ${token.borderRadius}px;
        background: none;
        color: ${token.colorText};
        font: inherit;
        font-size: 1rem;
        text-align: left;
        cursor: pointer;

        &:hover,
        &[data-active='true'] {
            background: ${token.colorFillTertiary};
        }

        &[data-active='true'] {
            color: ${token.colorPrimary};
            font-weight: 600;
        }

        &[data-danger='true'] {
            color: ${token.colorError};
        }

        &:focus-visible {
            outline: 2px solid ${token.colorPrimary};
            outline-offset: -2px;
        }
    `,

    drawerThemeRow: css`
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 2.75rem;
        padding: 0 0.75rem;
        border-top: 1px solid ${token.colorBorderSecondary};
        border-bottom: 1px solid ${token.colorBorderSecondary};
        color: ${token.colorText};
        font-size: 1rem;
    `,

    quotaLabel: css`
        color: ${token.colorTextSecondary};
        font-size: 0.875rem;
        white-space: nowrap;
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

    footer: css`
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: 0.25rem 0.75rem;
        min-height: var(--footer-h);
        padding: 0.75rem 1.5rem;
        font-size: 0.85rem;

        @media (max-width: 767.98px) {
            font-size: 0.9rem;
        }

        @media (max-width: 575.98px) {
            padding: 0.75rem 1rem;
        }
    `,

    footerLinks: css`
        display: flex;
        align-items: center;
        gap: 0.75rem;
        white-space: nowrap;
    `,

    footerLink: css`
        display: inline-flex;
        align-items: center;
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

        /* Touch targets need ~44px; desktop keeps the footer at its fixed height (pages size against it). */
        @media (pointer: coarse) {
            min-height: 2.75rem;
        }
    `,

    footerSep: css`
        color: ${token.colorTextTertiary};
    `,

    footerCopy: css`
        color: ${token.colorTextTertiary};

        @media (max-width: 575.98px) {
            flex-basis: 100%;
            text-align: center;
        }
    `,

    footerCopySep: css`
        @media (max-width: 575.98px) {
            display: none;
        }
    `,
}))
