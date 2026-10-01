import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { ErrorState } from './ErrorState'

describe('ErrorState', () => {
    it('shows the generic copy and tries again on request', async () => {
        const onRetry = jest.fn()
        const { user } = renderWithProviders(<ErrorState onRetry={onRetry} />)

        expect(screen.getByText('Something went wrong on our side. Please try again.')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Try again' }))

        expect(onRetry).toHaveBeenCalledTimes(1)
    })
})
