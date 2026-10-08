import { createStyles } from 'antd-style'

export const useStyles = createStyles(({ css }) => ({
    /* Takes the player's own class, so it fills the same box. The 16/9 mirrors Vidstack's default player ratio at its
       zero specificity, so a page's player class still overrides it, as it does for the player. */
    placeholder: css`
        display: inline-flex;
        align-items: center;
        justify-content: center;

        :where(&) {
            aspect-ratio: 16 / 9;
        }
    `,
}))
