import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button, Popover } from 'antd'
import { ButtonTooltip } from './ButtonTooltip'

const TITLE = 'Save as preset'

const setCanHover = (canHover: boolean) => {
    window.matchMedia = (query: string) =>
        ({
            matches: canHover,
            media: query,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
        }) as unknown as MediaQueryList
}

const hoverButton = async () => {
    render(
        <ButtonTooltip title={TITLE}>
            <Button aria-label={TITLE}>Save</Button>
        </ButtonTooltip>,
    )
    await userEvent.hover(screen.getByRole('button'))
}

describe('ButtonTooltip', () => {
    const originalMatchMedia = window.matchMedia

    afterEach(() => {
        window.matchMedia = originalMatchMedia
    })

    it('shows the tooltip where a pointer can hover', async () => {
        setCanHover(true)

        await hoverButton()

        expect(await screen.findByRole('tooltip')).toHaveTextContent(TITLE)
    })

    it('shows no tooltip on a touch screen, and keeps the button', async () => {
        setCanHover(false)

        await hoverButton()

        expect(screen.getByRole('button', { name: TITLE })).toBeInTheDocument()
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })

    it('still lets a popover around it open on a touch screen', async () => {
        setCanHover(false)
        render(
            <Popover content="Preset list" trigger="click">
                <ButtonTooltip title={TITLE}>
                    <Button aria-label={TITLE}>Apply</Button>
                </ButtonTooltip>
            </Popover>,
        )

        await userEvent.click(screen.getByRole('button'))

        expect(await screen.findByText('Preset list')).toBeInTheDocument()
    })
})
