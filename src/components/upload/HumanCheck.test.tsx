import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HumanCheck } from './HumanCheck'

// The real widget needs a live Cloudflare script, which jsdom can't load; buttons stand in for its callbacks.
jest.mock('@marsidev/react-turnstile', () => ({
    Turnstile: ({ onError, onSuccess }: { onError: () => void; onSuccess: (token: string) => void }) => (
        <>
            <button type="button" onClick={onError}>
                Fail the check
            </button>
            <button type="button" onClick={() => onSuccess('token-1')}>
                Pass the check
            </button>
        </>
    ),
}))
jest.mock('@/design/ThemeContext', () => ({ useTheme: () => ({ isDark: false, setScheme: jest.fn() }) }))

describe('HumanCheck', () => {
    it('hints how to recover when the widget reports an error', async () => {
        const onToken = jest.fn()

        render(<HumanCheck onToken={onToken} />)

        expect(screen.queryByText(/couldn’t load the human check/i)).not.toBeInTheDocument()

        await userEvent.click(screen.getByRole('button', { name: 'Fail the check' }))

        expect(onToken).toHaveBeenCalledWith(null)
        expect(
            screen.getByText('Couldn’t load the human check. Reload the page, or allow challenges.cloudflare.com.'),
        ).toBeInTheDocument()
    })

    it('clears the hint once the widget recovers on its own', async () => {
        const onToken = jest.fn()

        render(<HumanCheck onToken={onToken} />)

        await userEvent.click(screen.getByRole('button', { name: 'Fail the check' }))
        await userEvent.click(screen.getByRole('button', { name: 'Pass the check' }))

        expect(onToken).toHaveBeenLastCalledWith('token-1')
        expect(screen.queryByText(/couldn’t load the human check/i)).not.toBeInTheDocument()
    })
})
