import { ApiRequestError, describePresetError } from '@/api/errors'
import { listPresets } from '@/api/presets'
import { useAuth } from '@/auth/AuthContext'
import { memberAuth, signedOutAuth } from '@/test/auth'
import { buildPreset } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { screen, waitFor } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { type Preset, RequestErrorCode } from 'adlens-shared'
import { ApplyPresetPopover } from './ApplyPresetPopover'

jest.mock('@/auth/AuthContext', () => ({ useAuth: jest.fn() }))
jest.mock('@/api/presets', () => ({ listPresets: jest.fn() }))

const LAST_USED = buildPreset({ id: 'preset-1', name: 'Launch week', lastUsedAt: '2026-10-10T09:00:00.000Z' })

const OTHER = buildPreset({ id: 'preset-2', name: 'Meta US', lastUsedAt: '2026-10-01T09:00:00.000Z' })

const NEVER_USED = buildPreset({ id: 'preset-3', name: 'Stories', lastUsedAt: null })

const getApplyPresetButton = () => screen.getByRole('button', { name: 'Apply a preset' })

const getApplyButton = () => screen.getByRole('button', { name: 'Apply' })

const renderPopover = (presets: Preset[], isDisabled?: boolean, selectedPresetId: string | null = null) => {
    const onApply = jest.fn()

    jest.mocked(listPresets).mockResolvedValue(presets)

    return {
        ...renderWithProviders(
            <ApplyPresetPopover onApply={onApply} isDisabled={isDisabled} selectedPresetId={selectedPresetId} />,
        ),
        onApply,
    }
}

const waitForPresets = () => waitFor(() => expect(getApplyPresetButton()).toBeEnabled())

const openPopover = async (user: UserEvent) => {
    await waitForPresets()
    await user.click(getApplyPresetButton())

    return screen.findByRole('button', { name: 'Apply' })
}

// The disabled button takes no pointer events, so its tooltip shows from the wrapper around it.
const expectUnavailable = async (user: UserEvent) => {
    expect(getApplyPresetButton()).toBeDisabled()

    await user.hover(getApplyPresetButton().parentElement as HTMLElement)

    expect(await screen.findByText('No presets yet')).toBeInTheDocument()
}

// Each test opens antd's popover, select and tooltip: seconds of work under a full parallel run.
jest.setTimeout(20_000)

describe('ApplyPresetPopover', () => {
    beforeEach(() => {
        jest.mocked(useAuth).mockReturnValue(memberAuth())
        jest.mocked(listPresets).mockReset()
    })

    it('says Apply a preset once there are presets', async () => {
        const { user } = renderPopover([LAST_USED])

        await waitForPresets()
        await user.hover(getApplyPresetButton())

        expect(await screen.findByText('Apply a preset')).toBeInTheDocument()
    })

    it('is unavailable without presets', async () => {
        const { user } = renderPopover([])

        await waitFor(() => expect(listPresets).toHaveBeenCalled())

        await expectUnavailable(user)
    })

    it('is unavailable while the presets load', async () => {
        jest.mocked(listPresets).mockReturnValue(new Promise<Preset[]>(() => {}))
        const { user } = renderWithProviders(<ApplyPresetPopover onApply={jest.fn()} />)

        await expectUnavailable(user)
    })

    it('is unavailable without a session, which has no presets to load', async () => {
        jest.mocked(useAuth).mockReturnValue(signedOutAuth())
        const { user } = renderPopover([LAST_USED])

        await expectUnavailable(user)
        expect(listPresets).not.toHaveBeenCalled()
    })

    it('is unavailable when the only preset is the one already applied, and says so', async () => {
        const { user } = renderPopover([LAST_USED], false, LAST_USED.id)

        await waitFor(() => expect(listPresets).toHaveBeenCalled())
        await user.hover(getApplyPresetButton().parentElement as HTMLElement)

        expect(await screen.findByText('No other preset to apply')).toBeInTheDocument()
        expect(getApplyPresetButton()).toBeDisabled()
    })

    it('says the presets couldn’t load, not that there are none', async () => {
        const failure = new ApiRequestError(RequestErrorCode.Unavailable)

        jest.mocked(listPresets).mockRejectedValue(failure)
        const { user } = renderWithProviders(<ApplyPresetPopover onApply={jest.fn()} />)

        await waitFor(() => expect(listPresets).toHaveBeenCalled())
        await user.hover(getApplyPresetButton().parentElement as HTMLElement)

        expect(await screen.findByText(describePresetError(failure))).toBeInTheDocument()
        expect(screen.queryByText('No presets yet')).not.toBeInTheDocument()
        expect(getApplyPresetButton()).toBeDisabled()
    })

    it('is disabled while the analysis runs', async () => {
        renderPopover([LAST_USED], true)

        await waitFor(() => expect(listPresets).toHaveBeenCalled())

        expect(getApplyPresetButton()).toBeDisabled()
    })

    it('preselects the last used preset and applies it, then closes', async () => {
        const { user, onApply } = renderPopover([NEVER_USED, OTHER, LAST_USED])

        const apply = await openPopover(user)

        expect(screen.getByTitle(LAST_USED.name)).toBeInTheDocument()

        await user.click(apply)

        expect(onApply).toHaveBeenCalledWith(LAST_USED)
        await waitFor(() => expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument())
    })

    it('starts empty when no preset was used yet, with Apply disabled until one is chosen', async () => {
        const unusedOther = { ...OTHER, lastUsedAt: null }
        const { user, onApply } = renderPopover([NEVER_USED, unusedOther])

        const apply = await openPopover(user)

        expect(apply).toBeDisabled()

        await user.click(screen.getByRole('combobox'))
        await user.click(await screen.findByTitle(OTHER.name))
        await user.click(getApplyButton())

        expect(onApply).toHaveBeenCalledWith(unusedOther)
    })

    it('disables the preset already applied to the settings, and says so on hover', async () => {
        const { user } = renderPopover([LAST_USED, OTHER], false, OTHER.id)

        await openPopover(user)
        await user.click(screen.getByRole('combobox'))

        const applied = (await screen.findByText(OTHER.name)).closest('.ant-select-item-option') as HTMLElement

        expect(applied).toHaveClass('ant-select-item-option-disabled')

        await user.hover(screen.getByText(OTHER.name))

        expect(await screen.findByText('Already applied')).toBeInTheDocument()
    })

    it('preselects nothing when the last used preset is the one already applied', async () => {
        const { user } = renderPopover([LAST_USED, OTHER], false, LAST_USED.id)

        const apply = await openPopover(user)

        expect(apply).toBeDisabled()
        expect(screen.queryByTitle(LAST_USED.name)).not.toBeInTheDocument()
    })
})
