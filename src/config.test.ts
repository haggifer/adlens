const SITE_KEY = '0x4AAAAAAAsitekey'
const TEST_SITE_KEY = '1x00000000000000000000AA'
const SITE_URL = 'https://www.useadlens.com'

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
            NEXT_PUBLIC_SITE_URL: SITE_URL,
        }

        expect(await importConfig(env)).toMatchObject({ turnstileSiteKey: SITE_KEY, siteUrl: SITE_URL })
    })

    it('points at the local API and site when nothing is configured', async () => {
        expect(await importConfig({ NODE_ENV: 'development' })).toEqual({
            apiBaseUrl: 'http://localhost:8080',
            siteUrl: 'http://localhost:3000',
            turnstileSiteKey: TEST_SITE_KEY,
        })
    })

    it('rejects an API origin that isn’t a URL', async () => {
        await expect(
            importConfig({ NODE_ENV: 'development', NEXT_PUBLIC_API_BASE_URL: 'api.useadlens.com' }),
        ).rejects.toThrow('Invalid URL')
    })

    it('fails a production build without the site key instead of shipping the test key', async () => {
        await expect(
            importConfig({ NODE_ENV: 'production', VERCEL_ENV: 'production', NEXT_PUBLIC_SITE_URL: SITE_URL }),
        ).rejects.toThrow('NEXT_PUBLIC_TURNSTILE_SITE_KEY')
    })

    it('fails a production build without the site URL instead of pointing pages at localhost', async () => {
        await expect(
            importConfig({
                NODE_ENV: 'production',
                VERCEL_ENV: 'production',
                NEXT_PUBLIC_TURNSTILE_SITE_KEY: SITE_KEY,
            }),
        ).rejects.toThrow('NEXT_PUBLIC_SITE_URL')
    })
})
