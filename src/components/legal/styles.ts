import { createStyles } from 'antd-style'
import { HEADING_FONT_STACK } from '@/fonts'

export const useStyles = createStyles(({ token, css }) => ({
    page: css`
        display: flex;
        justify-content: center;
        padding: 0 0 4rem;

        @media (max-width: 575.98px) {
            padding-bottom: 3rem;
        }
    `,

    column: css`
        display: flex;
        flex-direction: column;
        width: min(48rem, 100%);
    `,

    /* Pinned under the header. Its padding, not the page's, spaces it from the header, so it already sits at its
       sticky offset and doesn't jump when scrolling starts. Opaque, so the text scrolling under it never shows through
       behind the Back button. */
    backBar: css`
        position: sticky;
        top: var(--header-h);
        z-index: 5;
        padding: 0.75rem 0;
        background: ${token.colorBgLayout};
    `,

    document: css`
        width: 100%;
        padding: 2.5rem 3rem;
        border: 1px solid ${token.colorBorderSecondary};
        border-radius: ${token.borderRadiusLG}px;
        background: ${token.colorBgContainer};
        box-shadow: ${token.boxShadowTertiary};
        color: ${token.colorText};
        font-size: 0.95rem;
        line-height: 1.7;
        overflow-wrap: break-word;

        @media (max-width: 575.98px) {
            padding: 1.5rem 1.25rem;
        }

        h2,
        h3 {
            /* Clears the header and the sticky Back button when jumping to a section. */
            scroll-margin-top: calc(var(--header-h) + 4.5rem);
            font-family: ${HEADING_FONT_STACK};
            color: ${token.colorTextHeading};
            letter-spacing: -0.01em;
        }

        h2 {
            margin: 2.5rem 0 0.75rem;
            font-size: 1.25rem;
            font-weight: 600;
        }

        h3 {
            margin: 1.75rem 0 0.5rem;
            font-size: 1.05rem;
            font-weight: 600;
        }

        p,
        ul,
        ol {
            margin: 0 0 1rem;
        }

        ul,
        ol {
            padding-left: 1.5rem;
        }

        li + li {
            margin-top: 0.4rem;
        }

        a {
            color: ${token.colorLink};
            text-decoration: underline;
            text-underline-offset: 0.15em;

            &:hover {
                color: ${token.colorLinkHover};
            }
        }

        strong {
            font-weight: 600;
        }

        table {
            width: 100%;
            margin: 0 0 1rem;
            border-collapse: collapse;
            font-size: 0.9rem;

            @media (max-width: 575.98px) {
                display: block;
                overflow-x: auto;
            }
        }

        th,
        td {
            padding: 0.5rem 0.75rem;
            border: 1px solid ${token.colorBorderSecondary};
            text-align: left;
            vertical-align: top;
        }

        th {
            background: ${token.colorFillQuaternary};
            font-weight: 600;
        }
    `,

    title: css`
        margin: 0;
        font-family: ${HEADING_FONT_STACK};
        color: ${token.colorTextHeading};
        font-size: clamp(1.75rem, 4vw, 2.25rem);
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1.2;
    `,

    updated: css`
        margin: 0.5rem 0 2rem;
        color: ${token.colorTextTertiary};
        font-size: 0.875rem;
    `,
}))
