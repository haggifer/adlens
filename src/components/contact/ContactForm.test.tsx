import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { sendContactMessage } from '@/api/contact'
import ContactForm from './ContactForm'

jest.mock('@/api/contact', () => ({ sendContactMessage: jest.fn(async () => undefined) }))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => ({ user: { email: 'member@example.com' } }) }))

const MESSAGE = 'I would like to know how AdLens handles TikTok ads.'

describe('ContactForm', () => {
    beforeEach(() => jest.mocked(sendContactMessage).mockClear())

    it("fills in a signed-in user's email and sends the message", async () => {
        render(<ContactForm />)

        expect(screen.getByLabelText('Your email')).toHaveValue('member@example.com')

        await userEvent.type(screen.getByLabelText('Message'), MESSAGE)
        await userEvent.click(screen.getByRole('button', { name: /send message/i }))

        await waitFor(() =>
            expect(sendContactMessage).toHaveBeenCalledWith({
                email: 'member@example.com',
                message: MESSAGE,
                website: '',
            }),
        )
        expect(await screen.findByText('Message sent')).toBeInTheDocument()
    })

    it('asks for a longer message instead of sending a too-short one', async () => {
        render(<ContactForm />)

        await userEvent.type(screen.getByLabelText('Message'), 'hi')
        await userEvent.click(screen.getByRole('button', { name: /send message/i }))

        expect(await screen.findByText('Write at least 10 characters')).toBeInTheDocument()
        expect(sendContactMessage).not.toHaveBeenCalled()
    })
})
