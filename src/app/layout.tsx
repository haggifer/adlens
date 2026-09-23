import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import { config } from '@/config'
import { parseScheme, SCHEME_COOKIE } from '@/design/scheme-cookie'
import { FONT_VARIABLE_CLASSES } from '@/fonts'
import Providers from './Providers'
import 'bootstrap/dist/css/bootstrap-utilities.min.css'
import './globals.css'

const TITLE = 'AdLens — Find out why your video ads underperform'
const DESCRIPTION =
    'Upload a video ad and AdLens checks it against the ad policies and creative best practices of the platforms you target, with timestamps and cited sources for every finding.'

export const metadata: Metadata = {
    metadataBase: new URL(config.siteUrl),
    title: {
        default: TITLE,
        template: '%s · AdLens',
    },
    description: DESCRIPTION,
    applicationName: 'AdLens',
    keywords: ['video ads', 'ad policy check', 'ad approval', 'creative best practices', 'AI video analysis'],
    openGraph: {
        type: 'website',
        siteName: 'AdLens',
        url: '/',
        title: TITLE,
        description: DESCRIPTION,
        locale: 'en_US',
    },
    twitter: {
        card: 'summary',
        title: TITLE,
        description: DESCRIPTION,
    },
    robots: { index: true, follow: true },
}

interface IProps {
    children: ReactNode
}

// Reading the scheme cookie makes every route dynamic; accepted so the first paint already has the right scheme.
export default async function RootLayout({ children }: IProps) {
    const cookieStore = await cookies()
    const scheme = parseScheme(cookieStore.get(SCHEME_COOKIE)?.value)

    return (
        <html lang="en" data-scheme={scheme} style={{ colorScheme: scheme }} className={FONT_VARIABLE_CLASSES}>
            <body>
                <Providers initialScheme={scheme}>{children}</Providers>
            </body>
        </html>
    )
}
