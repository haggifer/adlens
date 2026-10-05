interface SessionControlProps {
    'aria-disabled': true | undefined
    onClick: () => void
}

const ignoreClick = () => {}

// While the session loads, a session control looks exactly as it will once ready, so nothing changes when it comes
// alive, but it does nothing yet. Not `disabled`: that would restyle it and make it blink when enabled.
export const getSessionControlProps = (isInert: boolean, onClick: () => void): SessionControlProps =>
    isInert ? { 'aria-disabled': true, onClick: ignoreClick } : { 'aria-disabled': undefined, onClick }
