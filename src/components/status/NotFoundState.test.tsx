import { renderWithProviders } from '@/test/render'
import { screen } from '@testing-library/react'
import { NotFoundState } from './NotFoundState'

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))

describe('NotFoundState', () => {
    it('says the page doesn’t exist and goes home on request', async () => {
        const { user } = renderWithProviders(<NotFoundState />)

        expect(screen.getByText('Page not found')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Go to the home page' }))

        expect(mockPush).toHaveBeenCalledWith('/')
    })
})
