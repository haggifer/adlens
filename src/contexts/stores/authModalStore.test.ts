import { useAuthModalStore } from './authModalStore'

const INITIAL_STATE = useAuthModalStore.getState()

describe('authModalStore', () => {
    beforeEach(() => useAuthModalStore.setState(INITIAL_STATE, true))

    it('drops the other-address note once another view opens', () => {
        useAuthModalStore.getState().setView('confirm')
        useAuthModalStore.getState().setIsOtherAddressLink(true)
        useAuthModalStore.getState().setView('signin')

        expect(useAuthModalStore.getState().isOtherAddressLink).toBe(false)
    })
})
