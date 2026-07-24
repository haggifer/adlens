import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Providers from './providers'
import './globals.css'

export const metadata: Metadata = {
    title: 'AdLens',
    description: 'AI-powered video ad diagnostic tool',
}

interface IProps {
    children: ReactNode
}

export default function RootLayout({ children }: IProps) {
    return (
        <html lang="en">
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    )
}
