import { ApiRequestError, describePresetError } from '@/api/errors'
import { createPreset, listPresets, updatePreset } from '@/api/presets'
import { ensureSession } from '@/auth/anonymous-session'
import { useAuth } from '@/auth/AuthContext'
import { PRESETS_KEY } from '@/hooks/usePresets'
import { formatPlacementLabel, MARKET_LABELS, PLATFORM_LABELS } from '@/labels'
import { memberAuth, signedOutAuth } from '@/test/auth'
import { buildPreset } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import {
    type AnalysisSettings,
    type AnalysisSettingsInput,
    Market,
    Placement,
    Platform,
    type Preset,
    PRESET_NAME_MAX_LENGTH,
    RequestErrorCode,
} from 'adlens-shared'
import { PRESET_NAME_REQUIRED_COPY, PRESET_NAME_TOO_LONG_COPY } from './preset-name'
import { PresetModal } from './PresetModal'

jest.mock('@/auth/AuthContext', () => ({ useAuth: jest.fn() }))
jest.mock('@/auth/anonymous-session', () => ({ ensureSession: jest.fn() }))
jest.mock('@/api/presets', () => ({ listPresets: jest.fn(), createPreset: jest.fn(), updatePreset: jest.fn() }))

const SETTINGS: AnalysisSettings = {
    platforms: [Platform.Meta],
    placements: [Placement.MetaFeed],
    markets: [Market.UK],
}

const EDITED = buildPreset({ id: 'preset-1', name: 'Launch week', settings: SETTINGS, isDefault: true })

const OTHER = buildPreset({ id: 'preset-2', name: 'Meta US' })

const getOverwritePrompt = (name: string) => `A preset named “${name}” already exists. Overwrite it?`

interface RenderOptions {
    preset?: Preset
    initialSettings?: AnalysisSettingsInput
}

const renderModal = ({ preset, initialSettings }: RenderOptions = {}) => {
    const onClose = jest.fn()
    const onSaved = jest.fn()
    const view = renderWithProviders(
        <PresetModal
            isOpen
            preset={preset}
            initialSettings={initialSettings}
            title="Save as preset"
            onClose={onClose}
            onSaved={onSaved}
        />,
    )

    return { ...view, onClose, onSaved }
}

// The presets list loads in the background; a name clash is only known once it has.
const waitForPresets = () => waitFor(() => expect(listPresets).toHaveBeenCalled())

const enterName = async (user: UserEvent, name: string) => {
    await user.clear(screen.getByLabelText('Name'))
    await user.paste(name)
}

const clickSave = (user: UserEvent) => user.click(screen.getByRole('button', { name: 'Save' }))

const MARKETS_SELECT_INDEX = 2

// A chosen option shows twice, as a tag and in the open list, so the list entry is picked by its class.
const pickMarket = async (user: UserEvent, market: Market) => {
    await user.click(screen.getAllByRole('combobox')[MARKETS_SELECT_INDEX])

    const matches = await screen.findAllByTitle(MARKET_LABELS[market])

    await user.click(matches.find((match) => match.classList.contains('ant-select-item-option')) ?? matches[0])
}

// The modal has a Cancel of its own.
const getPopconfirmCancel = () => {
    const buttons = screen.getAllByRole('button', { name: 'Cancel' })

    return buttons.find((button) => button.closest('.ant-popconfirm')) ?? buttons[0]
}

// Each test fills the form and waits for antd's modal, popconfirm and notification: seconds of work under a full
// parallel run.
jest.setTimeout(20_000)

describe('PresetModal', () => {
    beforeEach(() => {
        jest.mocked(useAuth).mockReturnValue(memberAuth())
        jest.mocked(ensureSession).mockReset().mockResolvedValue()
        jest.mocked(listPresets).mockReset().mockResolvedValue([EDITED, OTHER])
        jest.mocked(createPreset).mockReset().mockResolvedValue(OTHER)
        jest.mocked(updatePreset).mockReset().mockResolvedValue(EDITED)
    })

    it('fills Edit from the preset, with Make default checked for the default', () => {
        renderModal({ preset: EDITED })

        expect(screen.getByLabelText('Name')).toHaveValue(EDITED.name)
        expect(screen.getByTitle(PLATFORM_LABELS[Platform.Meta])).toBeInTheDocument()
        expect(screen.getByTitle(formatPlacementLabel(Placement.MetaFeed))).toBeInTheDocument()
        expect(screen.getByTitle(MARKET_LABELS[Market.UK])).toBeInTheDocument()
        expect(screen.getByRole('checkbox', { name: 'Make default' })).toBeChecked()
    })

    it('keeps Save disabled until a setting is chosen', async () => {
        const { user } = renderModal()

        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

        await pickMarket(user, Market.US)

        expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
    })

    it('never changes the settings it was opened with', async () => {
        const initialSettings = { ...SETTINGS, markets: [...SETTINGS.markets] }
        const { user } = renderModal({ initialSettings })

        await pickMarket(user, Market.US)

        expect(initialSettings).toEqual(SETTINGS)
    })

    it('starts Make default unchecked for a new preset', () => {
        renderModal({ initialSettings: SETTINGS })

        expect(screen.getByRole('checkbox', { name: 'Make default' })).not.toBeChecked()
    })

    it('creates a preset from the given settings, then closes with a notification', async () => {
        const { user, onClose, onSaved } = renderModal({ initialSettings: SETTINGS })
        await waitForPresets()

        await enterName(user, '  Spring sale ')
        await user.click(screen.getByRole('checkbox', { name: 'Make default' }))
        await clickSave(user)

        await waitFor(() => expect(onClose).toHaveBeenCalled())
        expect(createPreset).toHaveBeenCalledWith({ name: 'Spring sale', settings: SETTINGS, isDefault: true })
        expect(updatePreset).not.toHaveBeenCalled()
        expect(onSaved).toHaveBeenCalledWith(OTHER)
        expect(await screen.findByText('Preset saved')).toBeInTheDocument()
    })

    it('updates the edited preset, clearing the default when unchecked', async () => {
        const { user, onClose } = renderModal({ preset: EDITED })
        await waitForPresets()

        await user.click(screen.getByRole('checkbox', { name: 'Make default' }))
        await clickSave(user)

        await waitFor(() => expect(onClose).toHaveBeenCalled())
        expect(updatePreset).toHaveBeenCalledWith(EDITED.id, {
            name: EDITED.name,
            settings: SETTINGS,
            isDefault: false,
        })
        expect(createPreset).not.toHaveBeenCalled()
    })

    it('never asks to overwrite when an edited preset keeps its own name', async () => {
        const { user, onClose } = renderModal({ preset: EDITED })
        await waitForPresets()

        await enterName(user, EDITED.name.toUpperCase())
        await clickSave(user)

        await waitFor(() => expect(onClose).toHaveBeenCalled())
        expect(screen.queryByText(getOverwritePrompt(EDITED.name.toUpperCase()))).not.toBeInTheDocument()
    })

    it('asks before overwriting another preset’s name, and Overwrite sends overwrite', async () => {
        const { user, onClose } = renderModal({ initialSettings: SETTINGS })
        await waitForPresets()

        await enterName(user, ' meta us  ')
        await clickSave(user)

        expect(await screen.findByText(getOverwritePrompt('meta us'))).toBeInTheDocument()
        expect(createPreset).not.toHaveBeenCalled()

        await user.click(screen.getByRole('button', { name: 'Overwrite' }))

        await waitFor(() => expect(onClose).toHaveBeenCalled())
        expect(createPreset).toHaveBeenCalledWith({ name: 'meta us', settings: SETTINGS, overwrite: true })
    })

    // The checkbox started unchecked for a new preset; it never described the preset being overwritten.
    it('leaves the default alone when Overwrite replaces it with Make default unchecked', async () => {
        const { user, onClose } = renderModal({ initialSettings: SETTINGS })
        await waitForPresets()

        await enterName(user, EDITED.name)
        await clickSave(user)
        await user.click(await screen.findByRole('button', { name: 'Overwrite' }))

        await waitFor(() => expect(onClose).toHaveBeenCalled())
        expect(jest.mocked(createPreset).mock.calls[0][0]).not.toHaveProperty('isDefault')
    })

    it('sends nothing when the overwrite is cancelled', async () => {
        const { user, onClose } = renderModal({ initialSettings: SETTINGS })
        await waitForPresets()

        await enterName(user, OTHER.name)
        await clickSave(user)
        await screen.findByText(getOverwritePrompt(OTHER.name))
        await user.click(getPopconfirmCancel())

        expect(createPreset).not.toHaveBeenCalled()
        expect(onClose).not.toHaveBeenCalled()
    })

    it('asks to overwrite when the server reports the name taken', async () => {
        jest.mocked(createPreset).mockRejectedValueOnce(new ApiRequestError(RequestErrorCode.PresetNameTaken))
        const { user, onClose } = renderModal({ initialSettings: SETTINGS })
        await waitForPresets()

        await enterName(user, 'Saved in another tab')
        await clickSave(user)

        expect(await screen.findByText(getOverwritePrompt('Saved in another tab'))).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Overwrite' }))

        await waitFor(() => expect(onClose).toHaveBeenCalled())
        expect(createPreset).toHaveBeenLastCalledWith({
            name: 'Saved in another tab',
            settings: SETTINGS,
            overwrite: true,
        })
        expect(jest.mocked(createPreset).mock.lastCall?.[0]).not.toHaveProperty('isDefault')
    })

    it('shows the copy and refreshes the list when the edited preset was deleted elsewhere', async () => {
        const error = new ApiRequestError(RequestErrorCode.NotFound)
        jest.mocked(updatePreset).mockRejectedValueOnce(error)
        const { user, onClose, queryClient } = renderModal({ preset: EDITED })
        const invalidate = jest.spyOn(queryClient, 'invalidateQueries')
        await waitForPresets()

        await clickSave(user)

        expect(await screen.findByText(describePresetError(error))).toBeInTheDocument()
        expect(invalidate).toHaveBeenCalledWith({ queryKey: [PRESETS_KEY] })
        expect(onClose).not.toHaveBeenCalled()
    })

    it('shows the limit error in the modal', async () => {
        const error = new ApiRequestError(RequestErrorCode.PresetLimitReached)
        jest.mocked(createPreset).mockRejectedValueOnce(error)
        const { user, onClose } = renderModal({ initialSettings: SETTINGS })
        await waitForPresets()

        await enterName(user, 'One too many')
        await clickSave(user)

        expect(await screen.findByText(describePresetError(error))).toBeInTheDocument()
        expect(onClose).not.toHaveBeenCalled()
    })

    it('starts a session before the first save without one', async () => {
        jest.mocked(useAuth).mockReturnValue(signedOutAuth())
        const { user, onClose } = renderModal({ initialSettings: SETTINGS })

        await enterName(user, 'First preset')
        await clickSave(user)

        await waitFor(() => expect(onClose).toHaveBeenCalled())
        expect(ensureSession).toHaveBeenCalled()
        expect(jest.mocked(ensureSession).mock.invocationCallOrder[0]).toBeLessThan(
            jest.mocked(createPreset).mock.invocationCallOrder[0],
        )
    })

    it('requires a name', async () => {
        const { user } = renderModal({ initialSettings: SETTINGS })

        await enterName(user, '   ')
        await clickSave(user)

        expect(await screen.findByText(PRESET_NAME_REQUIRED_COPY)).toBeInTheDocument()
        expect(createPreset).not.toHaveBeenCalled()
    })

    it('refuses a name over the limit', async () => {
        const tooLong = 'a'.repeat(PRESET_NAME_MAX_LENGTH + 1)
        const { user } = renderModal({ initialSettings: SETTINGS })

        // Typing stops at the input's own limit, so a pasted-in value stands for one that got past it.
        fireEvent.change(screen.getByLabelText('Name'), { target: { value: tooLong } })
        await clickSave(user)

        expect(await screen.findByText(PRESET_NAME_TOO_LONG_COPY)).toBeInTheDocument()
        expect(createPreset).not.toHaveBeenCalled()
    })
})
