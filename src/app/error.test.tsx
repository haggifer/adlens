import { describeRequestError } from '@/api/errors'
import { renderWithProviders } from '@/test/render'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RequestErrorCode } from 'adlens-shared'
import RouteError from './error'

describe('RouteError', () => {
    it('never shows the error’s own message, and logs the error', () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
        const error = new Error('Cannot read properties of undefined (reading "analysis")')

        renderWithProviders(<RouteError error={error} retry={jest.fn()} />)

        expect(screen.getByText(describeRequestError(RequestErrorCode.Internal))).toBeInTheDocument()
        expect(screen.queryByText(/Cannot read properties/)).not.toBeInTheDocument()
        expect(consoleError).toHaveBeenCalledWith(error)
        consoleError.mockRestore()
    })

    it('retries through the retry prop Next passes', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
        const retry = jest.fn()

        renderWithProviders(<RouteError error={new Error('boom')} retry={retry} />)
        await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

        expect(retry).toHaveBeenCalledTimes(1)
        consoleError.mockRestore()
    })
})
