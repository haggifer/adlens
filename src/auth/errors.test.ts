import { describeError } from '@/auth/errors'

describe('describeError', () => {
    it('explains a refused disposable address and a history that could not be moved', () => {
        expect(describeError({ code: 'DISPOSABLE_EMAIL' })).toBe(
            'Sign up with a permanent email address. Temporary inboxes aren’t accepted.',
        )
        expect(describeError({ code: 'ACCOUNT_LINK_FAILED' })).toBe(
            'You’re signed in, but your earlier analyses couldn’t be moved. Contact us and we’ll move them.',
        )
    })
})
