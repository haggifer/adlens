import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useNavigationStore } from '@/contexts/stores/navigationStore'
import { BackButton } from './BackButton'

const back = jest.fn()
const push = jest.fn()

jest.mock('next/navigation', () => ({ useRouter: () => ({ back, push }) }))

describe('BackButton', () => {
    beforeEach(() => {
        back.mockClear()
        push.mockClear()
    })

    it('goes to the fallback page when the page was opened directly', async () => {
        useNavigationStore.setState({ hasNavigated: false })
        render(<BackButton fallbackHref="/history" />)

        await userEvent.click(screen.getByRole('button', { name: /back/i }))

        expect(push).toHaveBeenCalledWith('/history')
        expect(back).not.toHaveBeenCalled()
    })

    it('returns to the previous in-app page', async () => {
        useNavigationStore.setState({ hasNavigated: true })
        render(<BackButton fallbackHref="/history" />)

        await userEvent.click(screen.getByRole('button', { name: /back/i }))

        expect(back).toHaveBeenCalled()
        expect(push).not.toHaveBeenCalled()
    })
})
