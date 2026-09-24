'use client'

import Link from 'next/link'
import { useContactModalStore } from '@/contexts/stores/contactModalStore'
import { useStyles } from './styles'

export default function Footer() {
    const { styles, cx } = useStyles()
    const setIsContactOpen = useContactModalStore((s) => s.setIsOpen)

    return (
        <footer className={styles.footer}>
            <nav className={styles.footerLinks} aria-label="Legal and contact">
                <Link href="/privacy" className={styles.footerLink}>
                    Privacy
                </Link>
                <span className={styles.footerSep} aria-hidden="true">
                    /
                </span>
                <Link href="/terms" className={styles.footerLink}>
                    Terms of Use
                </Link>
                <span className={styles.footerSep} aria-hidden="true">
                    /
                </span>
                <button type="button" className={styles.footerLink} onClick={() => setIsContactOpen(true)}>
                    Contact
                </button>
            </nav>
            <span className={cx(styles.footerSep, styles.footerCopySep)} aria-hidden="true">
                /
            </span>
            <span className={styles.footerCopy}>AdLens 2026</span>
        </footer>
    )
}
