import { useNavigationStore } from './navigationStore'

const INITIAL_STATE = useNavigationStore.getState()

describe('navigationStore', () => {
    beforeEach(() => useNavigationStore.setState(INITIAL_STATE, true))

    it('records the landing page without counting it as a navigation', () => {
        useNavigationStore.getState().trackPath('/privacy')
        useNavigationStore.getState().trackPath('/privacy')

        expect(useNavigationStore.getState()).toMatchObject({ landingPath: '/privacy', hasNavigated: false })
    })

    it('marks a move to another page as a navigation', () => {
        useNavigationStore.getState().trackPath('/')
        useNavigationStore.getState().trackPath('/terms')

        expect(useNavigationStore.getState().hasNavigated).toBe(true)
    })
})
