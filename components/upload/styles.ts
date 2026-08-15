import { createStyles } from 'antd-style'
import { HEADING_FONT_STACK } from '@/lib/fonts'

const useStyles = createStyles(({ token, css, isDarkMode }) => ({
    page: css`
        display: flex;
        flex-direction: column;
        min-height: calc(100dvh - var(--header-h) - var(--footer-h));
        padding: 2.5rem 0 3rem;

        @media (max-width: 991.98px) {
            padding: 1.5rem 0 2rem;
        }
    `,

    hero: css`
        max-width: 46rem;
        margin: 0 auto 3rem;
        text-align: center;

        @media (max-width: 991.98px) {
            margin-bottom: 1.75rem;
        }
    `,

    heroTitle: css`
        margin: 0 0 1.25rem;
        font-family: ${HEADING_FONT_STACK};
        color: ${token.colorTextHeading};
        font-size: 3.75rem;
        font-weight: 700;
        line-height: 1.15;
        letter-spacing: -0.02em;
    `,

    heroAccent: css`
        color: ${token.colorPrimary};
    `,

    heroSubtitle: css`
        max-width: 34rem;
        margin: 0 auto;
        color: ${token.colorTextSecondary};
        font-size: 1.375rem;
        line-height: 1.5;
    `,

    workspace: css`
        display: flex;
        flex: 1;
        align-items: center;
        justify-content: center;
        gap: 2.5rem;

        @media (max-width: 991.98px) {
            flex-direction: column;
            gap: 1.5rem;
        }
    `,

    right: css`
        width: 22rem;
        max-width: 100%;
        flex-shrink: 0;

        @media (max-width: 991.98px) {
            width: min(28rem, 92vw);
        }
    `,

    frame: css`
        position: relative;
        width: min(28rem, 82vw, 52vh);
        aspect-ratio: 1 / 1;
        flex-shrink: 0;
        border: 1.5px solid ${token.colorPrimary};
        border-radius: ${token.borderRadius}px;
        background: color-mix(in srgb, ${token.colorPrimary} 6%, transparent);
        overflow: hidden;
        box-shadow:
            0 18px 48px -16px rgba(0, 0, 0, ${isDarkMode ? '0.72' : '0.3'}),
            ${token.boxShadowTertiary},
            0 0 0 1px ${token.colorPrimary},
            0 0 ${isDarkMode ? '26px -8px' : '16px -12px'} ${token.colorPrimary};
        transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;

        &[data-dragging='true'] {
            border-color: ${token.colorPrimaryHover};
            box-shadow:
                0 0 0 1px ${token.colorPrimaryHover},
                0 0 44px -2px ${token.colorPrimaryHover};
        }

        &[data-video='true'] {
            width: fit-content;
            max-width: min(34rem, 92vw);
            aspect-ratio: auto;
            background: #000000;
        }

        &[data-video='true']:hover [data-overlay] {
            opacity: 1;
        }

        .ant-upload.ant-upload-drag {
            height: 100%;
            background: transparent;
            border: none;
            border-radius: 0;
        }

        .ant-upload-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            height: 100%;
        }
    `,

    dragger: css`
        height: 100%;
    `,

    info: css`
        position: absolute;
        top: 0.35rem;
        right: 0.35rem;
        z-index: 2;
        display: inline-flex;
        padding: 0.5rem;
        color: ${token.colorTextTertiary};
        font-size: 1rem;
        line-height: 1;
        cursor: help;
        opacity: 0.75;
        transition:
            color 0.2s ease,
            opacity 0.2s ease;

        &:hover {
            color: ${token.colorPrimary};
            opacity: 1;
        }
    `,

    reqKey: css`
        font-weight: 600;
    `,

    icon: css`
        color: ${token.colorPrimary};
        font-size: 45px;
        line-height: 1;
    `,

    title: css`
        font-family: ${HEADING_FONT_STACK};
        color: ${token.colorText};
        font-size: 1.1rem;
        font-weight: 600;
    `,

    hint: css`
        color: ${token.colorTextSecondary};
        font-size: 0.85rem;
    `,

    video: css`
        display: block;
        width: auto;
        height: auto;
        max-width: min(34rem, 92vw);
        max-height: min(68vh, calc(100dvh - 12rem));
        background: #000000;
    `,

    overlay: css`
        position: absolute;
        top: 0.6rem;
        right: 0.6rem;
        z-index: 3;
        display: flex;
        gap: 0.4rem;
        opacity: 0;
        transition: opacity 0.2s ease;

        .ant-btn {
            color: #ffffff;
            background: rgba(0, 0, 0, 0.55);
            border: none;
        }

        .ant-btn:hover {
            background: rgba(0, 0, 0, 0.75) !important;
        }

        @media (hover: none) {
            opacity: 1;
        }
    `,

    panel: css`
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1.5rem;
        border: 1px solid ${token.colorBorderSecondary};
        border-radius: ${token.borderRadiusLG}px;
        background: ${token.colorBgContainer};
        box-shadow: ${token.boxShadowTertiary};
        transition:
            background 0.3s ease,
            border-color 0.3s ease;
    `,

    panelTitle: css`
        margin: 0;
        font-family: ${HEADING_FONT_STACK};
        color: ${token.colorText};
        font-size: 1.35rem;
        font-weight: 700;
        letter-spacing: -0.01em;
    `,

    featureList: css`
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
        margin: 0.25rem 0 0;
        padding: 0;
        list-style: none;
    `,

    featureItem: css`
        display: flex;
        align-items: flex-start;
        gap: 0.6rem;
        color: ${token.colorTextSecondary};
        font-size: 0.95rem;

        .anticon {
            margin-top: 0.2rem;
            color: ${token.colorPrimary};
        }
    `,

    field: css`
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
    `,

    fieldLabel: css`
        color: ${token.colorText};
        font-size: 0.85rem;
        font-weight: 500;
    `,
}))

export default useStyles
