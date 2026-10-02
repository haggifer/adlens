import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CONTACT_MESSAGE_MAX_LENGTH, RequestErrorCode, type UploadTarget } from 'adlens-shared'
import type { AuthContextValue } from '@/auth/AuthContext'
import { ApiRequestError } from '@/api/errors'
import { createContactUploads, sendContactMessage } from '@/api/contact'
import { uploadToSignedUrl } from '@/storage/upload'
import { anonymousAuth, MEMBER_EMAIL, memberAuth } from '@/test/auth'
import { ContactForm } from './ContactForm'

const mockUseAuth = jest.fn<AuthContextValue, []>()
const mockGetToken = jest.fn<Promise<string>, []>()

jest.mock('@/api/contact', () => ({
    createContactUploads: jest.fn(),
    sendContactMessage: jest.fn(async () => undefined),
}))
jest.mock('@/storage/upload', () => ({ uploadToSignedUrl: jest.fn() }))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
// Turnstile's widget can't run in jsdom; the stand-in hands out whatever mockGetToken resolves with.
jest.mock('@/components/human-check/HumanCheck', () => {
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

const ATTACHMENTS_LABEL = 'Screenshots (optional)'

const ATTACHMENTS_HINT = 'Up to 5 images: PNG, JPEG or WebP, up to 8 MB each, up to 25 MB in total.'

const UPLOAD_FAILED_COPY = 'An image didn’t finish uploading. Please try again.'

const buildImage = (name: string, type = 'image/png') => new File(['image bytes'], name, { type })

const buildTarget = (name: string): UploadTarget => ({
    url: `https://storage.googleapis.com/bucket/contact/${name}?X-Goog-Signature=abc`,
    headers: { 'Content-Type': 'image/png' },
})

const SHOTS = [buildImage('first.png'), buildImage('second.png')]

const TARGETS = SHOTS.map((file) => buildTarget(file.name))

const renderForm = (auth: AuthContextValue = memberAuth()) => {
    mockUseAuth.mockReturnValue(auth)
    render(<ContactForm />)
}

const attach = async (files: File[], user = userEvent.setup()) => {
    await user.upload(screen.getByLabelText(ATTACHMENTS_LABEL), files)
}

const send = async (message: string) => {
    await userEvent.type(screen.getByLabelText('Message'), message)
    await userEvent.click(screen.getByRole('button', { name: /send message/i }))
}

// Each test types a message and some attach images through antd's Upload: up to about 4 s under a full parallel run.
jest.setTimeout(20_000)

describe('ContactForm', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockGetToken.mockResolvedValue(TOKEN)
        jest.mocked(createContactUploads).mockResolvedValue({ draftId: 'draft-1', uploads: TARGETS })
        jest.mocked(uploadToSignedUrl).mockResolvedValue(undefined)
        // antd draws picture-list thumbnails on a canvas, which jsdom doesn't implement; the list works without them.
        jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
        URL.createObjectURL = jest.fn(() => 'blob:preview')
        URL.revokeObjectURL = jest.fn()
    })

    afterEach(() => jest.restoreAllMocks())

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

    it('sends a message without images straight away, creating no draft', async () => {
        renderForm()

        expect(screen.getByText(ATTACHMENTS_HINT)).toBeInTheDocument()

        await send(MESSAGE)

        expect(await screen.findByText('Message sent')).toBeInTheDocument()
        expect(createContactUploads).not.toHaveBeenCalled()
        expect(uploadToSignedUrl).not.toHaveBeenCalled()
    })

    it('uploads the attached screenshots to a draft, then sends the message with the draft instead of a token', async () => {
        renderForm()

        await attach(SHOTS)

        expect(screen.getByText('first.png')).toBeInTheDocument()
        expect(screen.getByText('second.png')).toBeInTheDocument()

        await send(MESSAGE)

        expect(await screen.findByText('Message sent')).toBeInTheDocument()
        expect(createContactUploads).toHaveBeenCalledWith({
            files: SHOTS.map((file) => ({ name: file.name, contentType: 'image/png', size: file.size })),
            challengeToken: TOKEN,
        })
        expect(uploadToSignedUrl).toHaveBeenCalledTimes(2)
        expect(uploadToSignedUrl).toHaveBeenCalledWith(expect.objectContaining({ target: TARGETS[0], file: SHOTS[0] }))
        expect(uploadToSignedUrl).toHaveBeenCalledWith(expect.objectContaining({ target: TARGETS[1], file: SHOTS[1] }))
        expect(sendContactMessage).toHaveBeenCalledWith({
            email: MEMBER_EMAIL,
            message: MESSAGE,
            website: '',
            draftId: 'draft-1',
        })
    })

    it('sends nothing when an image fails to upload, and says so', async () => {
        jest.mocked(uploadToSignedUrl).mockRejectedValueOnce(new ApiRequestError(RequestErrorCode.UploadIncomplete))
        renderForm()

        await attach(SHOTS)
        await send(MESSAGE)

        expect(await screen.findByText(UPLOAD_FAILED_COPY)).toBeInTheDocument()
        expect(sendContactMessage).not.toHaveBeenCalled()
    })

    it('starts over with a new check, draft and uploads after a failed send, since the draft is spent', async () => {
        jest.mocked(sendContactMessage).mockRejectedValueOnce(new ApiRequestError(RequestErrorCode.Unavailable))
        mockGetToken.mockResolvedValueOnce('first-token').mockResolvedValueOnce('second-token')
        jest.mocked(createContactUploads)
            .mockResolvedValueOnce({ draftId: 'draft-1', uploads: TARGETS })
            .mockResolvedValueOnce({ draftId: 'draft-2', uploads: TARGETS })
        renderForm()

        await attach(SHOTS)
        await send(MESSAGE)
        await screen.findByText('AdLens is briefly unavailable. Please try again.')
        await userEvent.click(screen.getByRole('button', { name: /send message/i }))

        expect(await screen.findByText('Message sent')).toBeInTheDocument()
        expect(jest.mocked(createContactUploads).mock.calls.map(([input]) => input.challengeToken)).toEqual([
            'first-token',
            'second-token',
        ])
        expect(uploadToSignedUrl).toHaveBeenCalledTimes(4)
        expect(jest.mocked(sendContactMessage).mock.calls.map(([input]) => input.draftId)).toEqual([
            'draft-1',
            'draft-2',
        ])
    })

    it('refuses a file that isn’t a supported image until it is removed', async () => {
        renderForm()

        await attach([buildImage('clip.gif', 'image/gif')], userEvent.setup({ applyAccept: false }))

        expect(screen.getByText('clip.gif isn’t a PNG, JPEG or WebP image.')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled()

        await userEvent.click(screen.getByTitle('Remove file'))

        expect(screen.queryByText('clip.gif isn’t a PNG, JPEG or WebP image.')).not.toBeInTheDocument()

        await send(MESSAGE)

        expect(await screen.findByText('Message sent')).toBeInTheDocument()
        expect(sendContactMessage).toHaveBeenCalledWith(expect.objectContaining({ challengeToken: TOKEN }))
    })

    it('leaves the email empty for an anonymous visitor, and asks for a valid one', async () => {
        renderForm(anonymousAuth())

        expect(screen.getByLabelText('Your email')).toHaveValue('')

        await send(MESSAGE)

        expect(await screen.findByText('Enter a valid email')).toBeInTheDocument()
        expect(sendContactMessage).not.toHaveBeenCalled()
    })

    it('counts the message against the shared length limit', async () => {
        renderForm()

        expect(screen.getByLabelText('Message')).toHaveAttribute('maxlength', String(CONTACT_MESSAGE_MAX_LENGTH))
        expect(screen.getByText(`0 / ${CONTACT_MESSAGE_MAX_LENGTH}`)).toBeInTheDocument()
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
