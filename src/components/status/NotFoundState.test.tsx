import { renderWithProviders } from '@/test/render'
import { screen } from '@testing-library/react'
import { NotFoundState } from './NotFoundState'

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))

describe('NotFoundState', () => {
    it('goes home on request', async () => {
        const { user } = renderWithProviders(<NotFoundState />)

        await user.click(screen.getByRole('button', { name: 'Go to the home page' }))

        expect(mockPush).toHaveBeenCalledWith('/')
    })
})
