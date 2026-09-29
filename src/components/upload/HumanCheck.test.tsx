import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HumanCheck } from './HumanCheck'

const mockToken = 'challenge-token'

// The real widget needs a live Cloudflare script, which jsdom can't load; buttons stand in for its callbacks.
jest.mock('@marsidev/react-turnstile', () => ({
    Turnstile: ({
        onError,
        onExpire,
        onSuccess,
    }: {
        onError: () => void
        onExpire: () => void
        onSuccess: (token: string) => void
    }) => (
        <>
            <button type="button" onClick={onError}>
                Fail the check
            </button>
            <button type="button" onClick={onExpire}>
                Expire the token
            </button>
            <button type="button" onClick={() => onSuccess(mockToken)}>
                Pass the check
            </button>
        </>
    ),
}))
jest.mock('@/design/ThemeContext', () => ({ useTheme: () => ({ isDark: false, setScheme: jest.fn() }) }))

const FAILURE_HINT = 'Couldn’t load the human check. Reload the page, or allow challenges.cloudflare.com.'

describe('HumanCheck', () => {
    it('passes the token on once the check passes', async () => {
        const onToken = jest.fn()

        render(<HumanCheck onToken={onToken} />)
        await userEvent.click(screen.getByRole('button', { name: 'Pass the check' }))

        expect(onToken).toHaveBeenCalledWith(mockToken)
        expect(screen.queryByText(FAILURE_HINT)).not.toBeInTheDocument()
    })

    it('drops the token and hints how to recover when the widget reports an error', async () => {
        const onToken = jest.fn()

        render(<HumanCheck onToken={onToken} />)

        expect(screen.queryByText(FAILURE_HINT)).not.toBeInTheDocument()

        await userEvent.click(screen.getByRole('button', { name: 'Fail the check' }))

        expect(onToken).toHaveBeenCalledWith(null)
        expect(screen.getByText(FAILURE_HINT)).toBeInTheDocument()
    })

    it('drops an expired token, which the API would refuse', async () => {
        const onToken = jest.fn()

        render(<HumanCheck onToken={onToken} />)
        await userEvent.click(screen.getByRole('button', { name: 'Pass the check' }))
        await userEvent.click(screen.getByRole('button', { name: 'Expire the token' }))

        expect(onToken).toHaveBeenLastCalledWith(null)
    })

    it('clears the hint once the widget recovers on its own', async () => {
        const onToken = jest.fn()

        render(<HumanCheck onToken={onToken} />)
        await userEvent.click(screen.getByRole('button', { name: 'Fail the check' }))
        await userEvent.click(screen.getByRole('button', { name: 'Pass the check' }))

        expect(onToken).toHaveBeenLastCalledWith(mockToken)
        expect(screen.queryByText(FAILURE_HINT)).not.toBeInTheDocument()
    })
})
