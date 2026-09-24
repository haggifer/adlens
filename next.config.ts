import createMDX from '@next/mdx'
import type { NextConfig } from 'next'

// Ask Chromium browsers for the system color scheme, so a first visit is rendered in the right theme. Critical-CH makes
// the browser retry the very first request with the hint; other browsers get it from the client after hydration.
const SCHEME_HINT = 'Sec-CH-Prefers-Color-Scheme'

const nextConfig: NextConfig = {
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    { key: 'Accept-CH', value: SCHEME_HINT },
                    { key: 'Critical-CH', value: SCHEME_HINT },
                ],
            },
        ]
    },
}

const withMDX = createMDX()

export default withMDX(nextConfig)
