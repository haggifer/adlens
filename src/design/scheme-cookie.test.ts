import { resolveInitialScheme, SCHEME_COOKIE, writeSchemeCookie } from '@/design/scheme-cookie'

describe('resolveInitialScheme', () => {
    it('uses a stored choice over the system preference', () => {
        expect(resolveInitialScheme('light', 'dark')).toEqual({ scheme: 'light', isStored: true })
        expect(resolveInitialScheme('dark', 'light')).toEqual({ scheme: 'dark', isStored: true })
    })

    it('follows the system preference hint when nothing is stored', () => {
        expect(resolveInitialScheme(undefined, 'dark')).toEqual({ scheme: 'dark', isStored: false })
        expect(resolveInitialScheme(undefined, 'light')).toEqual({ scheme: 'light', isStored: false })
    })

    it('reads the hint in the quoted form browsers send', () => {
        expect(resolveInitialScheme(undefined, '"dark"')).toEqual({ scheme: 'dark', isStored: false })
    })

    it('ignores an unreadable stored choice and follows the hint instead', () => {
        expect(resolveInitialScheme('garbage', '"dark"')).toEqual({ scheme: 'dark', isStored: false })
    })

    it('falls back to light when there is neither a stored choice nor a hint', () => {
        expect(resolveInitialScheme(undefined, undefined)).toEqual({ scheme: 'light', isStored: false })
        expect(resolveInitialScheme('garbage', 'garbage')).toEqual({ scheme: 'light', isStored: false })
    })
})

describe('writeSchemeCookie', () => {
    afterEach(() => {
        document.cookie = `${SCHEME_COOKIE}=; max-age=0; path=/`
    })

    it('stores the choice in the cookie the root layout reads', () => {
        writeSchemeCookie('dark')

        expect(document.cookie).toBe(`${SCHEME_COOKIE}=dark`)
    })
})
