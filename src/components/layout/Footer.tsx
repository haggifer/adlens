'use client'

import { useStyles } from './styles'

export default function Footer() {
    const { styles } = useStyles()

    return (
        <footer className={styles.footer}>
            <a href="#" className={styles.footerLink}>
                Privacy
            </a>
            <span className={styles.footerSep}>/</span>
            <a href="#" className={styles.footerLink}>
                Terms of Use
            </a>
            <span className={styles.footerSep}>/</span>
            <span className={styles.footerCopy}>AdLens 2026</span>
        </footer>
    )
}
