import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import RouteError from './error'

describe('RouteError', () => {
    it('never shows the error’s own message, and logs the error', () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
        const error = new Error('Cannot read properties of undefined (reading "analysis")')

        renderWithProviders(<RouteError error={error} unstable_retry={jest.fn()} />)

        expect(screen.getByText('Something went wrong on our side. Please try again.')).toBeInTheDocument()
        expect(screen.queryByText(/Cannot read properties/)).not.toBeInTheDocument()
        expect(consoleError).toHaveBeenCalledWith(error)
        consoleError.mockRestore()
    })
})
