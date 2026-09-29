import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RequestErrorCode } from 'adlens-shared'
import type { AuthContextValue } from '@/auth/AuthContext'
import { ApiRequestError } from '@/api/errors'
import { sendContactMessage } from '@/api/contact'
import { anonymousAuth, MEMBER_EMAIL, memberAuth } from '@/test/auth'
import { ContactForm } from './ContactForm'

const mockUseAuth = jest.fn<AuthContextValue, []>()

jest.mock('@/api/contact', () => ({ sendContactMessage: jest.fn(async () => undefined) }))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))

const MESSAGE = 'I would like to know how AdLens handles TikTok ads.'

// The shared schema trims the message before counting, and asks for at least 10 characters.
const SHORTEST_MESSAGE = 'Ten chars!'

const renderForm = (auth: AuthContextValue = memberAuth()) => {
    mockUseAuth.mockReturnValue(auth)
    render(<ContactForm />)
}

const send = async (message: string) => {
    await userEvent.type(screen.getByLabelText('Message'), message)
    await userEvent.click(screen.getByRole('button', { name: /send message/i }))
}

describe('ContactForm', () => {
    beforeEach(() => jest.mocked(sendContactMessage).mockClear())

    it("fills in a signed-in user's email and sends the message", async () => {
        renderForm()

        expect(screen.getByLabelText('Your email')).toHaveValue(MEMBER_EMAIL)

        await send(MESSAGE)

        expect(await screen.findByText('Message sent')).toBeInTheDocument()
        expect(screen.getByText(`Thanks for writing. We'll reply to ${MEMBER_EMAIL}.`)).toBeInTheDocument()
        expect(sendContactMessage).toHaveBeenCalledWith({ email: MEMBER_EMAIL, message: MESSAGE, website: '' })
    })

    it('leaves the email empty for an anonymous visitor, and asks for a valid one', async () => {
        renderForm(anonymousAuth())

        expect(screen.getByLabelText('Your email')).toHaveValue('')

        await send(MESSAGE)

        expect(await screen.findByText('Enter a valid email')).toBeInTheDocument()
        expect(sendContactMessage).not.toHaveBeenCalled()
    })

    it('accepts a message of exactly the minimum length', async () => {
        renderForm()

        await send(SHORTEST_MESSAGE)

        expect(await screen.findByText('Message sent')).toBeInTheDocument()
    })

    it('asks for a longer message instead of sending one that is too short once trimmed', async () => {
        renderForm()

        await send(`  ${SHORTEST_MESSAGE.slice(1)}  `)

        expect(await screen.findByText('Write at least 10 characters')).toBeInTheDocument()
        expect(sendContactMessage).not.toHaveBeenCalled()
    })

    it('shows the copy for a failed send and keeps the message for another try', async () => {
        jest.mocked(sendContactMessage).mockRejectedValueOnce(new ApiRequestError(RequestErrorCode.RateLimited))
        renderForm()

        await send(MESSAGE)

        expect(await screen.findByText('Too many requests. Wait a moment and try again.')).toBeInTheDocument()
        expect(screen.getByLabelText('Message')).toHaveValue(MESSAGE)
    })

    it('never shows the raw error of a failure that isn’t an API error', async () => {
        jest.mocked(sendContactMessage).mockRejectedValueOnce(new Error('socket hang up'))
        renderForm()

        await send(MESSAGE)

        expect(await screen.findByText('Something went wrong on our side. Please try again.')).toBeInTheDocument()
        expect(screen.queryByText(/socket hang up/)).not.toBeInTheDocument()
    })
})
