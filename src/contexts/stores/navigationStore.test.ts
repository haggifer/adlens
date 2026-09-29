import { useNavigationStore } from './navigationStore'

const INITIAL_STATE = useNavigationStore.getState()

const trackPaths = (...paths: string[]) => paths.forEach((path) => useNavigationStore.getState().trackPath(path))

describe('navigationStore', () => {
    beforeEach(() => useNavigationStore.setState(INITIAL_STATE, true))

    it('records the landing page without counting it as a navigation', () => {
        trackPaths('/privacy', '/privacy')

        expect(useNavigationStore.getState()).toMatchObject({ landingPath: '/privacy', hasNavigated: false })
    })

    it('marks a move to another page as a navigation', () => {
        trackPaths('/', '/terms')

        expect(useNavigationStore.getState()).toMatchObject({ landingPath: '/', hasNavigated: true })
    })

    it('stays navigated after returning to the landing page, whose previous entry is now in the app', () => {
        trackPaths('/', '/terms', '/')

        expect(useNavigationStore.getState()).toMatchObject({ landingPath: '/', hasNavigated: true })
    })
})
