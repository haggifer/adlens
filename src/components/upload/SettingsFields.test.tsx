import { formatPlacementLabel, PLATFORM_LABELS } from '@/labels'
import { renderWithProviders } from '@/test/render'
import { screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { type AnalysisSettingsInput, Placement, Platform } from 'adlens-shared'
import { useState } from 'react'
import { getPlatformPlacements } from './platform-placements'
import { SettingsFields } from './SettingsFields'

const EMPTY: AnalysisSettingsInput = { platforms: [], placements: [], markets: [] }

const PLATFORM = Platform.Meta
const OTHER_PLATFORM = Platform.TikTok
const PLATFORM_PLACEMENTS = getPlatformPlacements(PLATFORM)

interface IHarnessProps {
    initial?: AnalysisSettingsInput
    isDisabled?: boolean
}

// Holds the value the way a parent form does, so each change round-trips back in as the next value.
const Harness = ({ initial = EMPTY, isDisabled }: IHarnessProps) => {
    const [value, setValue] = useState(initial)

    return (
        <>
            <SettingsFields value={value} onChange={setValue} isDisabled={isDisabled} />
            <output data-testid="value">{JSON.stringify(value)}</output>
        </>
    )
}

const readValue = (): AnalysisSettingsInput => JSON.parse(screen.getByTestId('value').textContent ?? '{}')

const getSelects = () => {
    const [platforms, placements, markets] = screen.getAllByRole('combobox')

    return { platforms, placements, markets }
}

// A chosen option shows twice, as a tag and in the open list, so the list entry is picked by its class.
const chooseOption = async (user: UserEvent, select: HTMLElement, label: string) => {
    await user.click(select)

    const matches = await screen.findAllByTitle(label)
    const option = matches.find((match) => match.classList.contains('ant-select-item-option'))

    await user.click(option ?? matches[0])
}

describe('SettingsFields', () => {
    it('adds the placements of a chosen platform', async () => {
        const { user } = renderWithProviders(<Harness />)

        await chooseOption(user, getSelects().platforms, PLATFORM_LABELS[PLATFORM])

        expect(readValue()).toEqual({ platforms: [PLATFORM], placements: PLATFORM_PLACEMENTS, markets: [] })
    })

    it('removes the placements of a cleared platform and keeps the other platform’s', async () => {
        const otherPlacements = getPlatformPlacements(OTHER_PLATFORM)
        const { user } = renderWithProviders(
            <Harness
                initial={{
                    platforms: [PLATFORM, OTHER_PLATFORM],
                    placements: [...PLATFORM_PLACEMENTS, ...otherPlacements],
                    markets: [],
                }}
            />,
        )

        await chooseOption(user, getSelects().platforms, PLATFORM_LABELS[PLATFORM])

        expect(readValue()).toEqual({ platforms: [OTHER_PLATFORM], placements: otherPlacements, markets: [] })
    })

    it('adds the platform of a chosen placement', async () => {
        const [first, second] = PLATFORM_PLACEMENTS
        const { user } = renderWithProviders(
            <Harness initial={{ platforms: [PLATFORM], placements: [first], markets: [] }} />,
        )

        await chooseOption(user, getSelects().placements, formatPlacementLabel(second))

        expect(readValue()).toEqual({ platforms: [PLATFORM], placements: [first, second], markets: [] })
    })

    it('drops a platform whose last placement is removed', async () => {
        const [first] = PLATFORM_PLACEMENTS
        const { user } = renderWithProviders(
            <Harness initial={{ platforms: [PLATFORM], placements: [first], markets: [] }} />,
        )

        await chooseOption(user, getSelects().placements, formatPlacementLabel(first))

        expect(readValue()).toEqual({ platforms: [], placements: [], markets: [] })
    })

    it('treats a value without lists as empty', () => {
        renderWithProviders(<SettingsFields value={{} as AnalysisSettingsInput} onChange={jest.fn()} />)

        expect(getSelects().placements).toBeDisabled()
    })

    it('disables Placements until a platform is chosen', () => {
        renderWithProviders(<Harness />)

        const { platforms, placements, markets } = getSelects()

        expect(platforms).toBeEnabled()
        expect(placements).toBeDisabled()
        expect(markets).toBeEnabled()
    })

    it('enables Placements once a platform is chosen', () => {
        const placement = Placement.MetaFeed

        renderWithProviders(<Harness initial={{ platforms: [PLATFORM], placements: [placement], markets: [] }} />)

        expect(getSelects().placements).toBeEnabled()
    })

    it('disables all three selects when disabled', () => {
        renderWithProviders(
            <Harness initial={{ platforms: [PLATFORM], placements: PLATFORM_PLACEMENTS, markets: [] }} isDisabled />,
        )

        const { platforms, placements, markets } = getSelects()

        expect(platforms).toBeDisabled()
        expect(placements).toBeDisabled()
        expect(markets).toBeDisabled()
    })
})
