'use client'

import { AppLink } from '@/components/utils/AppLink'
import { useContactModalStore } from '@/contexts/stores/contactModalStore'
import { useStyles } from './styles'

export function Footer() {
    const { styles, cx } = useStyles()
    const setIsContactOpen = useContactModalStore((s) => s.setIsOpen)

    return (
        <footer className={styles.footer}>
            <nav className={styles.footerLinks} aria-label="Legal and contact">
                <AppLink href="/privacy" className={styles.footerLink}>
                    Privacy
                </AppLink>
                <span className={styles.footerSep} aria-hidden="true">
                    /
                </span>
                <AppLink href="/terms" className={styles.footerLink}>
                    Terms of Use
                </AppLink>
                <span className={styles.footerSep} aria-hidden="true">
                    /
                </span>
                <button type="button" className={styles.footerLink} onClick={() => setIsContactOpen(true)}>
                    Contact us
                </button>
            </nav>
            <span className={cx(styles.footerSep, styles.footerCopySep)} aria-hidden="true">
                /
            </span>
            <span className={styles.footerCopy}>AdLens 2026</span>
        </footer>
    )
}
