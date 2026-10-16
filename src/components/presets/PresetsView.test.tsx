import { ApiRequestError, describeRequestError } from '@/api/errors'
import { listPresets } from '@/api/presets'
import { useAuth } from '@/auth/AuthContext'
import { initializingAuth, memberAuth, signedOutAuth } from '@/test/auth'
import { buildPreset } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { act, screen, waitFor } from '@testing-library/react'
import { MAX_PRESETS, RequestErrorCode } from 'adlens-shared'
import { PresetsView } from './PresetsView'

jest.mock('@/auth/AuthContext', () => ({ useAuth: jest.fn() }))
jest.mock('@/auth/anonymous-session', () => ({ ensureSession: jest.fn() }))
jest.mock('@/api/presets', () => ({
    listPresets: jest.fn(),
    createPreset: jest.fn(),
    updatePreset: jest.fn(),
    deletePreset: jest.fn(),
    setDefaultPreset: jest.fn(),
}))

const META_US = buildPreset({ id: 'preset-1', name: 'Meta US' })

const LAUNCH = buildPreset({ id: 'preset-2', name: 'Launch week' })

const LIMIT_COPY = `You can keep up to ${MAX_PRESETS} presets`

const buildPresets = (count: number) =>
    Array.from({ length: count }, (_, i) =>
        buildPreset({ id: `preset-${i}`, name: `Preset ${String(i).padStart(2, '0')}` }),
    )

const getCreateButtons = () => screen.getAllByRole('button', { name: /Create/ })

// While loading, antd shows the empty state under a spinner that blocks clicks.
const waitForLoaded = () =>
    waitFor(() => expect(screen.getByRole('table').closest('[aria-busy]')).toHaveAttribute('aria-busy', 'false'))

// Opening antd's modal and tooltip takes seconds under a full parallel run.
jest.setTimeout(20_000)

describe('PresetsView', () => {
    beforeEach(() => {
        jest.mocked(useAuth).mockReturnValue(memberAuth())
        jest.mocked(listPresets).mockReset().mockResolvedValue([META_US, LAUNCH])
    })

    it('offers one Create button below the limit, and disables it at the limit and says why', async () => {
        const { queryClient, user } = renderWithProviders(<PresetsView />)

        await screen.findByText('Meta US')

        expect(getCreateButtons()).toHaveLength(1)
        expect(getCreateButtons()[0]).toBeEnabled()

        jest.mocked(listPresets).mockResolvedValue(buildPresets(MAX_PRESETS))
        await act(() => queryClient.invalidateQueries())
        await screen.findByText('Preset 00')

        const create = getCreateButtons()[0]

        expect(create).toBeDisabled()

        await user.hover(create.parentElement as HTMLElement)

        expect(await screen.findByText(LIMIT_COPY)).toBeInTheDocument()
    })

    it('offers Create in the empty state', async () => {
        jest.mocked(listPresets).mockResolvedValue([])
        renderWithProviders(<PresetsView />)

        expect(await screen.findByText('No presets yet')).toBeInTheDocument()
        expect(getCreateButtons()).toHaveLength(2)
    })

    it('shows only a spinner while the session loads', () => {
        jest.mocked(useAuth).mockReturnValue(initializingAuth())
        const { container } = renderWithProviders(<PresetsView />)

        expect(container.querySelector('.ant-spin')).toBeInTheDocument()
        expect(screen.queryByRole('table')).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Create/ })).not.toBeInTheDocument()
    })

    // Creating a preset starts a session, so a visitor without one is not asked to sign in first.
    it('shows the empty state with Create to a visitor without a session, not a sign-in prompt', async () => {
        jest.mocked(useAuth).mockReturnValue(signedOutAuth())
        renderWithProviders(<PresetsView />)

        expect(await screen.findByText('No presets yet')).toBeInTheDocument()
        expect(getCreateButtons()).toHaveLength(2)
        expect(screen.queryByRole('button', { name: 'Sign In' })).not.toBeInTheDocument()
        expect(listPresets).not.toHaveBeenCalled()
    })

    it('opens the Create preset modal', async () => {
        const { user } = renderWithProviders(<PresetsView />)

        await screen.findByText('Meta US')
        await user.click(getCreateButtons()[0])

        expect(await screen.findByText('Create preset')).toBeInTheDocument()
        expect(screen.getByLabelText('Name')).toHaveValue('')
    })

    it('shows the copy for a failed load, not an empty state', async () => {
        jest.mocked(listPresets).mockRejectedValue(new ApiRequestError(RequestErrorCode.Unavailable))
        renderWithProviders(<PresetsView />)

        expect(await screen.findByText(describeRequestError(RequestErrorCode.Unavailable))).toBeInTheDocument()

        await waitForLoaded()

        expect(screen.queryByText('No presets yet')).not.toBeInTheDocument()
    })
})
