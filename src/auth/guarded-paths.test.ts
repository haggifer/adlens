import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { isGuardedPath } from './guarded-paths'

const APP_DIR = join(process.cwd(), 'src', 'app')

const toRoute = (pageFile: string) => {
    const segments = relative(APP_DIR, pageFile).split(sep).slice(0, -1)

    return `/${segments.map((segment) => segment.replace(/^\[.+\]$/, 'some-id')).join('/')}`
}

const PAGES = readdirSync(APP_DIR, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith(`${sep}page.tsx`) || file === 'page.tsx')
    .map((file) => join(APP_DIR, file))
    .map((file) => ({ route: toRoute(file), isPrivate: readFileSync(file, 'utf8').includes('<PrivateRoute') }))

describe('isGuardedPath', () => {
    it.each(PAGES)('matches whether $route renders PrivateRoute', ({ route, isPrivate }) => {
        expect(isGuardedPath(route)).toBe(isPrivate)
    })

    it('finds the guarded pages', () => {
        expect(PAGES.some(({ isPrivate }) => isPrivate)).toBe(true)
    })

    it('matches whole path segments only', () => {
        const [guarded] = PAGES.filter(({ isPrivate }) => isPrivate)

        expect(isGuardedPath(`${guarded.route}-other`)).toBe(false)
    })
})
