import { getSessionControlProps } from './session-control'

describe('getSessionControlProps', () => {
    it('wires the action once the session is ready', () => {
        const onClick = jest.fn()

        const props = getSessionControlProps(false, onClick)

        expect(props).toEqual({ 'aria-disabled': undefined, onClick })
    })

    it('marks the control unavailable and ignores clicks while the session loads', () => {
        const onClick = jest.fn()

        const props = getSessionControlProps(true, onClick)

        props.onClick()

        expect(props['aria-disabled']).toBe(true)
        expect(onClick).not.toHaveBeenCalled()
    })
})
