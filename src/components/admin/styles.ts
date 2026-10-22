import { HEADING_FONT_STACK } from '@/fonts'
import { createStyles } from 'antd-style'

export const useStyles = createStyles(({ token, css }) => ({
    // min-width: 0 lets the tables scroll inside their own boxes instead of widening the page on a phone.
    page: css`
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        flex: 1;
        min-width: 0;
        padding: 2rem 0;
    `,

    pageTitle: css`
        margin: 0;
        font-family: ${HEADING_FONT_STACK};
        color: ${token.colorTextHeading};
        font-size: clamp(1.75rem, 4vw, 2.25rem);
        font-weight: 700;
        letter-spacing: -0.02em;
    `,

    pageMeta: css`
        margin: 0;
        color: ${token.colorTextSecondary};
        font-size: 0.9rem;
    `,

    // Side by side, the presets, calendar and time columns make a popup about 520px wide, which antd then flips past
    // a phone's left edge. Below sm they stack in one column no wider than the screen: the presets as a row on top, the
    // time columns under the calendar. "&.ant-picker-dropdown" outranks antd's own ".ant-picker-dropdown …" rules.
    periodPopup: css`
        @media (max-width: 575.98px) {
            &.ant-picker-dropdown {
                max-width: calc(100vw - 2rem);
            }

            &.ant-picker-dropdown .ant-picker-panel-container {
                width: 100%;
            }

            &.ant-picker-dropdown .ant-picker-panel-container .ant-picker-panel-layout {
                flex-direction: column;
            }

            &.ant-picker-dropdown .ant-picker-panel-container .ant-picker-presets {
                min-width: 0;
                max-width: none;
            }

            &.ant-picker-dropdown .ant-picker-panel-container .ant-picker-presets ul {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
                height: auto;
                border-inline-end: 0;
                border-bottom: 1px solid ${token.colorSplit};
            }

            &.ant-picker-dropdown .ant-picker-panel-container .ant-picker-presets ul li + li {
                margin-top: 0;
            }

            &.ant-picker-dropdown .ant-picker-panel {
                display: flex;
            }

            &.ant-picker-dropdown .ant-picker-datetime-panel {
                flex-direction: column;
            }

            &.ant-picker-dropdown .ant-picker-datetime-panel .ant-picker-date-panel {
                width: auto;
            }

            &.ant-picker-dropdown .ant-picker-datetime-panel .ant-picker-time-panel {
                border-inline-start: 0;
                border-top: 1px solid ${token.colorSplit};
            }
        }
    `,
}))
