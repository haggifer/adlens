import { listPresets } from '@/api/presets'
import { useAuth } from '@/auth/AuthContext'
import { MARKET_LABELS } from '@/labels'
import { memberAuth } from '@/test/auth'
import { buildPreset } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { screen, waitFor, within } from '@testing-library/react'
import {
    type AnalysisSettings,
    type AnalysisSettingsInput,
    Market,
    Placement,
    Platform,
    type Preset,
} from 'adlens-shared'
import { PresetActions } from './PresetActions'

jest.mock('@/auth/AuthContext', () => ({ useAuth: jest.fn() }))
jest.mock('@/auth/anonymous-session', () => ({ ensureSession: jest.fn() }))
jest.mock('@/api/presets', () => ({ listPresets: jest.fn() }))

const SETTINGS: AnalysisSettings = {
    platforms: [Platform.Meta],
    placements: [Placement.MetaFeed, Placement.MetaReels],
    markets: [Market.UK, Market.US],
}

const PRESET = buildPreset({ name: 'Launch week', settings: SETTINGS })

const SELECTED_LABEL = `Preset: ${PRESET.name}`

interface RenderOptions {
    settings?: AnalysisSettingsInput
    appliedPreset?: Preset | null
    isDisabled?: boolean
}

const renderActions = ({ settings = SETTINGS, appliedPreset = null, isDisabled }: RenderOptions = {}) =>
    renderWithProviders(
        <PresetActions
            settings={settings}
            appliedPreset={appliedPreset}
            onApply={jest.fn()}
            onSaved={jest.fn()}
            isDisabled={isDisabled}
        />,
    )

const getSaveButton = () => screen.getByRole('button', { name: 'Save as preset' })

// Opening antd's modal and tooltips takes seconds under a full parallel run.
jest.setTimeout(20_000)

describe('PresetActions', () => {
    beforeEach(() => {
        jest.mocked(useAuth).mockReturnValue(memberAuth())
        jest.mocked(listPresets).mockReset().mockResolvedValue([PRESET])
    })

    it('marks the applied preset while the settings are its own, in any order', async () => {
        const reordered: AnalysisSettingsInput = {
            platforms: [Platform.Meta],
            placements: [Placement.MetaReels, Placement.MetaFeed],
            markets: [Market.US, Market.UK],
        }
        const { user } = renderActions({ settings: reordered, appliedPreset: PRESET })

        const icon = screen.getByRole('img', { name: SELECTED_LABEL })

        // Left of Save and Apply.
        expect(icon.compareDocumentPosition(getSaveButton()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

        await user.hover(icon)

        expect(await screen.findByRole('tooltip')).toHaveTextContent(SELECTED_LABEL)
    })

    it('drops the mark once the settings differ from the applied preset’s', () => {
        renderActions({ settings: { ...SETTINGS, markets: [Market.UK] }, appliedPreset: PRESET })

        expect(screen.queryByRole('img', { name: SELECTED_LABEL })).not.toBeInTheDocument()
    })

    it('shows no mark without an applied preset', () => {
        renderActions()

        expect(screen.queryByRole('img', { name: /^Preset:/ })).not.toBeInTheDocument()
    })

    it('opens Save as preset with the current settings', async () => {
        const { user } = renderActions()

        await user.click(getSaveButton())

        const dialog = await screen.findByRole('dialog')

        expect(within(dialog).getByText('Save as preset')).toBeInTheDocument()
        expect(within(dialog).getByTitle(MARKET_LABELS[Market.UK])).toBeInTheDocument()
        expect(within(dialog).getByTitle(MARKET_LABELS[Market.US])).toBeInTheDocument()
    })

    it('disables Save and Apply while the analysis runs, still naming Save in its tooltip', async () => {
        const { user } = renderActions({ isDisabled: true })

        await waitFor(() => expect(listPresets).toHaveBeenCalled())

        expect(getSaveButton()).toBeDisabled()
        expect(screen.getByRole('button', { name: 'Apply a preset' })).toBeDisabled()

        // The disabled button takes no pointer events, so its tooltip shows from the wrapper around it.
        await user.hover(getSaveButton().parentElement as HTMLElement)

        expect(await screen.findByText('Save as preset')).toBeInTheDocument()
    })

    it.each([
        ['nothing is chosen', { platforms: [], placements: [], markets: [] }],
        ['no field is touched yet', {}],
    ])('disables only Save while %s', async (_, settings) => {
        renderActions({ settings })

        // Apply turns on once the presets have loaded; an empty panel can still take one.
        await waitFor(() => expect(screen.getByRole('button', { name: 'Apply a preset' })).toBeEnabled())

        expect(getSaveButton()).toBeDisabled()
    })

    it('enables Save once one setting is chosen', () => {
        renderActions({ settings: { markets: SETTINGS.markets } })

        expect(getSaveButton()).toBeEnabled()
    })
})
