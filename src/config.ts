import { z } from 'zod'

// Cloudflare's documented always-pass test key, so local development needs no Turnstile widget of its own.
const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA'

// Public settings, inlined at build time. Each NEXT_PUBLIC_ variable must be referenced literally for Next to inline it.
const configSchema = z.object({
    apiBaseUrl: z.url(),
    siteUrl: z.url(),
    turnstileSiteKey: z.string().min(1),
})

export const config = configSchema.parse({
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080',
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || TURNSTILE_TEST_SITE_KEY,
})
