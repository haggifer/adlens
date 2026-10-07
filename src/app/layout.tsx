import { ACCOUNT_KIND_COOKIE, parseAccountKind } from '@/auth/account-kind-cookie'
import { config } from '@/config'
import { resolveInitialScheme, SCHEME_COOKIE, SCHEME_HINT_HEADER } from '@/design/scheme-cookie'
import { FONT_VARIABLE_CLASSES } from '@/fonts'
import 'bootstrap/dist/css/bootstrap-utilities.min.css'
import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import type { ReactNode } from 'react'
import './globals.css'
import { Providers } from './Providers'
import { SITE_DESCRIPTION, SITE_NAME, SITE_OPEN_GRAPH, SITE_TITLE } from './site-metadata'

export const metadata: Metadata = {
    metadataBase: new URL(config.siteUrl),
    title: {
        default: SITE_TITLE,
        template: `%s · ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    keywords: ['video ads', 'ad policy check', 'ad approval', 'creative best practices', 'AI video analysis'],
    openGraph: SITE_OPEN_GRAPH,
    // The large card shows opengraph-image.tsx, which X reads in place of a twitter:image of its own.
    twitter: {
        card: 'summary_large_image',
        title: SITE_TITLE,
        description: SITE_DESCRIPTION,
    },
    robots: { index: true, follow: true },
}

interface IProps {
    children: ReactNode
}

// Reading the cookies and the scheme hint makes every route dynamic; accepted so the first paint has the right scheme
// and the header the shape of this browser's last session.
export default async function RootLayout({ children }: IProps) {
    const cookieStore = await cookies()
    const headerList = await headers()

    const initialScheme = resolveInitialScheme(
        cookieStore.get(SCHEME_COOKIE)?.value,
        headerList.get(SCHEME_HINT_HEADER) ?? undefined,
    )
    const initialAccountKind = parseAccountKind(cookieStore.get(ACCOUNT_KIND_COOKIE)?.value)
    const { scheme } = initialScheme

    return (
        <html lang="en" data-scheme={scheme} style={{ colorScheme: scheme }} className={FONT_VARIABLE_CLASSES}>
            <body>
                <Providers initialScheme={initialScheme} initialAccountKind={initialAccountKind}>
                    {children}
                </Providers>
            </body>
        </html>
    )
}
