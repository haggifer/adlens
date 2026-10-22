import { AccountKind } from '@/auth/types'
import { renderWithProviders } from '@/test/render'
import { screen, within } from '@testing-library/react'
import { type AdminJob, type AdminUser, JobStatus } from 'adlens-shared'
import { ANONYMOUS_EMAIL } from './admin-table'
import { USER_TYPE_TAGS, UsersTable } from './UsersTable'

const toUser = (id: string, fields: Partial<AdminUser> = {}): AdminUser => ({
    id,
    createdAt: '2026-09-30T10:00:00.000Z',
    email: `${id}@example.com`,
    isAnonymous: false,
    emailVerified: true,
    isAdmin: false,
    ...fields,
})

// One Gemini 3.6 Flash call at its introductory global rate: $0.0104.
const toJob = (id: string, userId: string, fields: Partial<AdminJob> = {}): AdminJob => ({
    id,
    createdAt: '2026-09-30T10:00:00.000Z',
    status: JobStatus.Analyzed,
    userId,
    file: { name: 'ad.mp4' },
    usage: {
        calls: [
            {
                at: '2026-09-30T10:01:00.000Z',
                model: 'gemini-3.6-flash',
                location: 'global',
                promptTokens: 8447,
                candidatesTokens: 127,
                thoughtsTokens: 965,
                cachedTokens: 0,
                promptTokensByModality: { AUDIO: 750, VIDEO: 1980, TEXT: 5717 },
                cachedTokensByModality: {},
            },
        ],
    },
    ...fields,
})

const USERS = [
    toUser('member'),
    toUser('unconfirmed', { emailVerified: false }),
    toUser('admin', { isAdmin: true, emailVerified: false }),
    toUser('anon', { isAnonymous: true, email: null, emailVerified: false, createdAt: '2026-09-29T10:00:00.000Z' }),
]

const getCells = (row: HTMLElement) =>
    within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent)

// Via the email's text rather than getByRole('row', { name }), which is slow in an antd table.
const getUserCells = (email: string) => {
    const row = screen.getByText(email).closest('tr')

    if (!row) {
        throw new Error(`No table row holds ${email}`)
    }

    return getCells(row)
}

describe('UsersTable', () => {
    it('tags each user with their type, and shows an anonymous user without an email', () => {
        renderWithProviders(<UsersTable users={USERS} jobs={[]} />)

        expect(getUserCells(ANONYMOUS_EMAIL).slice(1, 3)).toEqual([
            ANONYMOUS_EMAIL,
            USER_TYPE_TAGS[AccountKind.Anonymous].label,
        ])
        expect(getUserCells('member@example.com')[2]).toBe(USER_TYPE_TAGS[AccountKind.Member].label)
        expect(getUserCells('unconfirmed@example.com')[2]).toBe(USER_TYPE_TAGS[AccountKind.Unconfirmed].label)
        expect(getUserCells('admin@example.com')[2]).toBe(USER_TYPE_TAGS[AccountKind.Admin].label)
    })

    it('shows each user’s job count and cost, and a dash for a cost it couldn’t price', () => {
        renderWithProviders(
            <UsersTable
                users={USERS}
                jobs={[toJob('j1', 'member'), toJob('j2', 'member'), toJob('j3', 'anon', { usage: undefined })]}
            />,
        )

        expect(getUserCells('member@example.com').slice(3)).toEqual(['2', '$0.021'])
        expect(getUserCells(ANONYMOUS_EMAIL).slice(3)).toEqual(['1', '—'])
    })

    it('lists the newest user first', () => {
        renderWithProviders(<UsersTable users={[USERS[3], USERS[0]]} jobs={[]} />)

        const emails = screen
            .getAllByRole('row')
            .slice(1)
            .map((row) => getCells(row)[1])

        expect(emails).toEqual(['member@example.com', ANONYMOUS_EMAIL])
    })
})
