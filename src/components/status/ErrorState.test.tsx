import { describeRequestError } from '@/api/errors'
import { renderWithProviders } from '@/test/render'
import { screen } from '@testing-library/react'
import { RequestErrorCode } from 'adlens-shared'
import { ErrorState } from './ErrorState'

describe('ErrorState', () => {
    it('shows the generic copy and tries again on request', async () => {
        const onRetry = jest.fn()
        const { user } = renderWithProviders(<ErrorState onRetry={onRetry} />)

        expect(screen.getByText(describeRequestError(RequestErrorCode.Internal))).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Try again' }))

        expect(onRetry).toHaveBeenCalledTimes(1)
    })
})
