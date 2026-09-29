const SITE_KEY = '0x4AAAAAAAsitekey'
const TEST_SITE_KEY = '1x00000000000000000000AA'

// config.ts parses the environment once, on import, so each case imports a fresh copy under its own environment.
const importConfig = async (env: NodeJS.ProcessEnv): Promise<unknown> => {
    let parsed: unknown

    jest.replaceProperty(process, 'env', env)
    await jest.isolateModulesAsync(async () => {
        ;({ config: parsed } = await import('./config'))
    })

    return parsed
}

describe('config', () => {
    afterEach(() => {
        jest.restoreAllMocks()
    })

    it("falls back to Cloudflare's test site key outside production", async () => {
        expect(await importConfig({ NODE_ENV: 'test', VERCEL_ENV: 'preview' })).toMatchObject({
            turnstileSiteKey: TEST_SITE_KEY,
        })
    })

    it('uses the configured site key in production', async () => {
        const env = {
            NODE_ENV: 'production' as const,
            VERCEL_ENV: 'production',
            NEXT_PUBLIC_TURNSTILE_SITE_KEY: SITE_KEY,
        }

        expect(await importConfig(env)).toMatchObject({ turnstileSiteKey: SITE_KEY })
    })

    it('fails a production build without the site key instead of shipping the test key', async () => {
        await expect(importConfig({ NODE_ENV: 'production', VERCEL_ENV: 'production' })).rejects.toThrow(
            'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
        )
    })
})
