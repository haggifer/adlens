import { ApiRequestError, describePresetError, describeRequestError } from '@/api/errors'
import { deletePreset, listPresets, setDefaultPreset } from '@/api/presets'
import { useAuth } from '@/auth/AuthContext'
import { PRESETS_KEY } from '@/hooks/usePresets'
import { memberAuth } from '@/test/auth'
import { buildPreset } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { StarFilled, StarOutlined } from '@ant-design/icons'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { type Preset, RequestErrorCode } from 'adlens-shared'
import type { ReactElement } from 'react'
import { PresetsTable } from './PresetsTable'
import { formatUsage } from './usage-label'

jest.mock('@/auth/AuthContext', () => ({ useAuth: jest.fn() }))
jest.mock('@/auth/anonymous-session', () => ({ ensureSession: jest.fn() }))
jest.mock('@/api/presets', () => ({
    listPresets: jest.fn(),
    createPreset: jest.fn(),
    updatePreset: jest.fn(),
    deletePreset: jest.fn(),
    setDefaultPreset: jest.fn(),
}))

const META_US = buildPreset({ id: 'preset-1', name: 'Meta US', usageCount: 3 })

const LAUNCH = buildPreset({ id: 'preset-2', name: 'Launch week', usageCount: 1, isDefault: true })

const SM_QUERY = '(min-width: 576px)'

const originalMatchMedia = window.matchMedia

const renderTable = (presets: Preset[] = [LAUNCH, META_US]) =>
    renderWithProviders(<PresetsTable presets={presets} isLoading={false} emptyText="No presets yet" />)

const rowOf = (name: string): HTMLElement => {
    const row = screen.getByText(name).closest('tr')

    if (!row) {
        throw new Error(`No table row holds ${name}`)
    }

    return row
}

// Both stars share their class and label; only the drawing tells them apart.
const isDrawnAs = (button: HTMLElement, icon: ReactElement) =>
    button.querySelector('.anticon')?.outerHTML === render(icon).container.innerHTML

// Once earlier tests have loaded the edit form's styles, every role query and user-event click across the table
// resolves computed styles for seconds: the label, a plain click and the title's text keep these tests fast.
const openDeleteConfirm = async (name: string) => {
    fireEvent.click(within(rowOf(name)).getByLabelText(`Delete ${name}`))

    const [title] = await screen.findAllByText('Delete this preset?')

    return within(title.closest<HTMLElement>('[role="dialog"]') ?? document.body)
}

const buildPresets = (count: number) =>
    Array.from({ length: count }, (_, i) =>
        buildPreset({ id: `preset-${i}`, name: `Preset ${String(i).padStart(2, '0')}` }),
    )

// Opening antd's confirm and its notification takes seconds under a full parallel run.
jest.setTimeout(20_000)

describe('PresetsTable', () => {
    beforeEach(() => {
        jest.mocked(useAuth).mockReturnValue(memberAuth())
        jest.mocked(listPresets).mockReset().mockResolvedValue([LAUNCH, META_US])
        jest.mocked(deletePreset).mockReset().mockResolvedValue()
        jest.mocked(setDefaultPreset).mockReset().mockResolvedValue()
    })

    afterEach(() => {
        window.matchMedia = originalMatchMedia
    })

    it('shows every preset on one page, even past the limit', () => {
        renderTable(buildPresets(25))

        expect(screen.getAllByRole('row')).toHaveLength(26)
        expect(document.querySelector('.ant-pagination')).not.toBeInTheDocument()
    })

    // jsdom ignores the CSS that shows the name cell's count only on phones, so both counts are present here.
    it('shows the usage count in the name cell, and in a Usages column from the sm breakpoint', () => {
        window.matchMedia = (query) => ({ ...originalMatchMedia(query), matches: query === SM_QUERY })
        renderTable()

        const nameCell = screen.getByText('Meta US').closest('td')

        expect(within(rowOf('Meta US')).getByText(String(META_US.usageCount))).toBeInTheDocument()
        expect(nameCell).toContainElement(screen.getByText(formatUsage(META_US.usageCount)))
    })

    it('marks the default with a pressed primary button that unsets it', async () => {
        const { user } = renderTable()
        const button = within(rowOf('Launch week')).getByRole('button', {
            name: 'Launch week is the default, click to unset',
        })

        expect(button).toHaveAttribute('aria-pressed', 'true')
        expect(button).toHaveClass('ant-btn-primary')
        expect(isDrawnAs(button, <StarFilled />)).toBe(true)

        await user.hover(button)

        expect(await screen.findByText('Default, click to unset')).toBeInTheDocument()

        await user.click(button)

        expect(setDefaultPreset).toHaveBeenCalledWith(null, expect.anything())
    })

    it('makes another preset the default', async () => {
        const { user } = renderTable()
        const button = within(rowOf('Meta US')).getByRole('button', { name: 'Make Meta US the default' })

        expect(button).toHaveAttribute('aria-pressed', 'false')
        expect(button).not.toHaveClass('ant-btn-primary')
        expect(isDrawnAs(button, <StarOutlined />)).toBe(true)

        await user.hover(button)

        expect(await screen.findByText('Make default')).toBeInTheDocument()

        await user.click(button)

        expect(setDefaultPreset).toHaveBeenCalledWith(META_US.id, expect.anything())
    })

    it('shows the copy when changing the default fails', async () => {
        const error = new ApiRequestError(RequestErrorCode.NotFound)

        jest.mocked(setDefaultPreset).mockRejectedValueOnce(error)
        jest.spyOn(console, 'error').mockImplementationOnce(() => {})
        const { user } = renderTable()

        await user.click(within(rowOf('Meta US')).getByRole('button', { name: 'Make Meta US the default' }))

        expect(await screen.findByText(describePresetError(error))).toBeInTheDocument()
    })

    it('refreshes the list when the preset was deleted elsewhere', async () => {
        jest.mocked(setDefaultPreset).mockRejectedValueOnce(new ApiRequestError(RequestErrorCode.NotFound))
        jest.spyOn(console, 'error').mockImplementationOnce(() => {})
        const { user, queryClient } = renderTable()
        const invalidate = jest.spyOn(queryClient, 'invalidateQueries')

        await user.click(within(rowOf('Meta US')).getByRole('button', { name: 'Make Meta US the default' }))

        await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: [PRESETS_KEY] }))
    })

    it('leaves the list alone when changing the default fails for another reason', async () => {
        jest.mocked(setDefaultPreset).mockRejectedValueOnce(new ApiRequestError(RequestErrorCode.Unavailable))
        jest.spyOn(console, 'error').mockImplementationOnce(() => {})
        const { user, queryClient } = renderTable()
        const invalidate = jest.spyOn(queryClient, 'invalidateQueries')

        await user.click(within(rowOf('Meta US')).getByRole('button', { name: 'Make Meta US the default' }))

        expect(await screen.findByText(describeRequestError(RequestErrorCode.Unavailable))).toBeInTheDocument()
        expect(invalidate).not.toHaveBeenCalled()
    })

    it('opens Edit preset filled with the preset', async () => {
        const { user } = renderTable()
        const button = within(rowOf('Meta US')).getByRole('button', { name: 'Edit Meta US' })

        await user.hover(button)

        expect(await screen.findByText('Edit')).toBeInTheDocument()

        await user.click(button)

        expect(await screen.findByText('Edit preset')).toBeInTheDocument()
        expect(screen.getByLabelText('Name')).toHaveValue(META_US.name)
    })

    it('deletes the preset once the user confirms', async () => {
        const { user } = renderTable()
        const confirm = await openDeleteConfirm('Meta US')

        await user.click(confirm.getByRole('button', { name: 'Delete' }))

        expect(await screen.findByText('Preset deleted')).toBeInTheDocument()
        expect(deletePreset).toHaveBeenCalledWith(META_US.id, expect.anything())
    })

    it('keeps the preset when the user cancels', async () => {
        const { user } = renderTable()
        const confirm = await openDeleteConfirm('Meta US')

        await user.click(confirm.getByRole('button', { name: 'Cancel' }))

        expect(deletePreset).not.toHaveBeenCalled()
    })

    it('shows the preset copy when the delete fails', async () => {
        const error = new ApiRequestError(RequestErrorCode.NotFound)

        jest.mocked(deletePreset).mockRejectedValueOnce(error)
        jest.spyOn(console, 'error').mockImplementationOnce(() => {})
        const { user, queryClient } = renderTable()
        const invalidate = jest.spyOn(queryClient, 'invalidateQueries')
        const confirm = await openDeleteConfirm('Meta US')

        await user.click(confirm.getByRole('button', { name: 'Delete' }))

        expect(await screen.findByText(describePresetError(error))).toBeInTheDocument()
        expect(screen.queryByText('Preset deleted')).not.toBeInTheDocument()
        // Deleted elsewhere: the refreshed list drops its row.
        expect(invalidate).toHaveBeenCalledWith({ queryKey: [PRESETS_KEY] })
    })
})
