'use client'

import Link from 'next/link'
import { useContactModalStore } from '@/contexts/stores/contactModalStore'
import { useStyles } from './styles'

export default function Footer() {
    const { styles } = useStyles()
    const setIsContactOpen = useContactModalStore((s) => s.setIsOpen)

    return (
        <footer className={styles.footer}>
            <Link href="/privacy" className={styles.footerLink}>
                Privacy
            </Link>
            <span className={styles.footerSep}>/</span>
            <Link href="/terms" className={styles.footerLink}>
                Terms of Use
            </Link>
            <span className={styles.footerSep}>/</span>
            <button type="button" className={styles.footerLink} onClick={() => setIsContactOpen(true)}>
                Contact
            </button>
            <span className={styles.footerSep}>/</span>
            <span className={styles.footerCopy}>AdLens 2026</span>
        </footer>
    )
}
