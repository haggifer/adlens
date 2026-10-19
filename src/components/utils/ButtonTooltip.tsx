'use client'

import { useHoverCapable } from '@/hooks/useHoverCapable'
import { Tooltip, type TooltipProps } from 'antd'

// A button's tooltip shows only where a pointer can hover. On a touch screen a tap opens it over the action the tap
// just took, and it stays until the next tap elsewhere; the button keeps its aria-label for screen readers. Held shut
// rather than left out, so what a wrapping Popover passes through it (the click, the ref) still reaches the button.
export function ButtonTooltip(props: TooltipProps) {
    const isHoverCapable = useHoverCapable()

    return <Tooltip {...props} {...(!isHoverCapable && { open: false })} />
}
