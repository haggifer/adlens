import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RequestErrorCode } from 'adlens-shared'
import type { AuthContextValue } from '@/auth/AuthContext'
import { ApiRequestError } from '@/api/errors'
import { sendContactMessage } from '@/api/contact'
import { anonymousAuth, MEMBER_EMAIL, memberAuth } from '@/test/auth'
import { ContactForm } from './ContactForm'

const mockUseAuth = jest.fn<AuthContextValue, []>()
const mockGetToken = jest.fn<Promise<string>, []>()

jest.mock('@/api/contact', () => ({ sendContactMessage: jest.fn(async () => undefined) }))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
// Turnstile's widget can't run in jsdom; the stand-in hands out whatever mockGetToken resolves with.
jest.mock('@/components/upload/HumanCheck', () => {
    const { useImperativeHandle } = jest.requireActual<typeof import('react')>('react')

    return {
        HumanCheck: ({ ref }: { ref: unknown }) => {
            useImperativeHandle(ref as never, () => ({ getToken: () => mockGetToken() }))
            return null
        },
    }
})

const MESSAGE = 'I would like to know how AdLens handles TikTok ads.'

// The shared schema trims the message before counting, and asks for at least 10 characters.
const SHORTEST_MESSAGE = 'Ten chars!'

const TOKEN = 'challenge-token'

const renderForm = (auth: AuthContextValue = memberAuth()) => {
    mockUseAuth.mockReturnValue(auth)
    render(<ContactForm />)
}

const send = async (message: string) => {
    await userEvent.type(screen.getByLabelText('Message'), message)
    await userEvent.click(screen.getByRole('button', { name: /send message/i }))
}

describe('ContactForm', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockGetToken.mockResolvedValue(TOKEN)
    })

    it("fills in a signed-in user's email and sends the message", async () => {
        renderForm()

        expect(screen.getByLabelText('Your email')).toHaveValue(MEMBER_EMAIL)

        await send(MESSAGE)

        expect(await screen.findByText('Message sent')).toBeInTheDocument()
        expect(screen.getByText(`Thanks for writing. We'll reply to ${MEMBER_EMAIL}.`)).toBeInTheDocument()
        expect(sendContactMessage).toHaveBeenCalledWith({
            email: MEMBER_EMAIL,
            message: MESSAGE,
            website: '',
            challengeToken: TOKEN,
        })
    })

    it('runs the human check for every message, never reusing a token', async () => {
        jest.mocked(sendContactMessage).mockRejectedValueOnce(new ApiRequestError(RequestErrorCode.Unavailable))
        mockGetToken.mockResolvedValueOnce('first-token').mockResolvedValueOnce('second-token')
        renderForm()

        await send(MESSAGE)
        await screen.findByText('AdLens is briefly unavailable. Please try again.')
        await userEvent.click(screen.getByRole('button', { name: /send message/i }))

        expect(await screen.findByText('Message sent')).toBeInTheDocument()
        expect(mockGetToken).toHaveBeenCalledTimes(2)
        expect(jest.mocked(sendContactMessage).mock.calls.map(([input]) => input.challengeToken)).toEqual([
            'first-token',
            'second-token',
        ])
    })

    it('sends nothing when the human check fails, and says so in the words of a message', async () => {
        mockGetToken.mockRejectedValueOnce(new ApiRequestError(RequestErrorCode.ChallengeFailed))
        renderForm()

        await send(MESSAGE)

        expect(
            await screen.findByText('The security check didn’t pass. Try it again, then send the message.'),
        ).toBeInTheDocument()
        expect(sendContactMessage).not.toHaveBeenCalled()
    })

    it('locks the form while the message is on its way', async () => {
        jest.mocked(sendContactMessage).mockReturnValueOnce(new Promise(() => undefined))
        renderForm()

        await send(MESSAGE)

        expect(screen.getByLabelText('Your email')).toBeDisabled()
        expect(screen.getByLabelText('Message')).toBeDisabled()
    })

    it('still passes the honeypot on, so the API can drop what a bot filled in', async () => {
        renderForm()

        fireEvent.change(screen.getByLabelText('Website'), { target: { value: 'https://spam.example' } })
        await send(MESSAGE)

        expect(await screen.findByText('Message sent')).toBeInTheDocument()
        expect(sendContactMessage).toHaveBeenCalledWith(expect.objectContaining({ website: 'https://spam.example' }))
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

        expect(
            await screen.findByText('Too many messages in the last hour. Please try again later.'),
        ).toBeInTheDocument()
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
