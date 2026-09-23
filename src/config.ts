import { z } from 'zod'

// Public settings, inlined at build time. Each NEXT_PUBLIC_ variable must be referenced literally for Next to inline it.
const configSchema = z.object({
    apiBaseUrl: z.url(),
    siteUrl: z.url(),
})

export const config = configSchema.parse({
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080',
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
})
