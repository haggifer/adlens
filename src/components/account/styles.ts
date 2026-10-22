import { HEADING_FONT_STACK } from '@/fonts'
import { createStyles } from 'antd-style'

export const useStyles = createStyles(({ token, css }) => ({
    page: css`
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        flex: 1;
        padding: 2.5rem 0;
    `,

    column: css`
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        width: min(36rem, 100%);
        padding: 2rem 0 2.5rem;

        /* The top of the Examples page (analysis styles' page), so every page's title starts at the same height. */
        @media (max-width: 991.98px) {
            padding-top: 1.5rem;
        }
    `,

    card: css`
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: min(28rem, 100%);
        padding: 1.5rem;
        border: 1px solid ${token.colorBorderSecondary};
        border-radius: ${token.borderRadiusLG}px;
        background: ${token.colorBgContainer};
        box-shadow: ${token.boxShadowTertiary};
    `,

    section: css`
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: 1.5rem;
        border: 1px solid ${token.colorBorderSecondary};
        border-radius: ${token.borderRadiusLG}px;
        background: ${token.colorBgContainer};
        box-shadow: ${token.boxShadowTertiary};
    `,

    dangerSection: css`
        border-color: ${token.colorErrorBorder};
    `,

    sectionTitle: css`
        margin: 0;
        font-family: ${HEADING_FONT_STACK};
        color: ${token.colorText};
        font-size: 1.15rem;
        font-weight: 600;
    `,

    sectionText: css`
        margin: 0;
        color: ${token.colorTextSecondary};
        font-size: 0.9rem;
    `,
}))
