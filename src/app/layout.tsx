import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { FONT_VARIABLE_CLASSES } from '@/fonts'
import { HARNESS_COOKIE, parseHarness } from '@/design/harness/harness-cookie'
import { parseScheme, SCHEME_COOKIE } from '@/design/scheme-cookie'
import Providers from './providers'
import 'bootstrap/dist/css/bootstrap-utilities.min.css'
import './globals.css'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: 'AdLens — Diagnose why your video ads underperform',
        template: '%s · AdLens',
    },
    description:
        'AdLens is an AI-powered video ad diagnostic tool. Upload a video ad and get a transcript, a structural breakdown, and grounded explanations of what’s holding its performance back.',
    applicationName: 'AdLens',
    keywords: ['video ads', 'ad analysis', 'creative diagnostics', 'ad performance', 'AI video analysis'],
    openGraph: {
        type: 'website',
        siteName: 'AdLens',
        url: '/',
        title: 'AdLens — Diagnose why your video ads underperform',
        description:
            'Upload a video ad and AdLens diagnoses what’s holding it back — transcript, structural breakdown, and grounded explanations.',
        locale: 'en_US',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'AdLens — Diagnose why your video ads underperform',
        description: 'Upload a video ad and AdLens diagnoses what’s holding it back — no guesswork.',
    },
    robots: { index: true, follow: true },
}

interface IProps {
    children: ReactNode
}

export default async function RootLayout({ children }: IProps) {
    const cookieStore = await cookies()
    const scheme = parseScheme(cookieStore.get(SCHEME_COOKIE)?.value)
    // TEMPORARY: design-harness state, seeded so neither the scheme nor the backdrop flash on load.
    const settings = parseHarness(cookieStore.get(HARNESS_COOKIE)?.value)

    return (
        <html lang="en" data-scheme={scheme} style={{ colorScheme: scheme }} className={FONT_VARIABLE_CLASSES}>
            <body>
                <Providers initialScheme={scheme} initialSettings={settings}>
                    {children}
                </Providers>
            </body>
        </html>
    )
}
