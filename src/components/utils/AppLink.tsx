'use client'

import { isLeaveConfirmed } from '@/components/utils/leave-guard'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentProps } from 'react'

type IProps = ComponentProps<typeof Link>

// Next's Link, cancelled in onNavigate (its documented way to block navigation) when the page is guarded and the
// visitor doesn't confirm. A link to the page already open leaves nothing behind, so it never asks.
export function AppLink({ onNavigate, ...props }: IProps) {
    const pathname = usePathname()

    const handleNavigate: IProps['onNavigate'] = (event) => {
        if (props.href !== pathname && !isLeaveConfirmed()) {
            event.preventDefault()

            return
        }

        onNavigate?.(event)
    }

    return <Link {...props} onNavigate={handleNavigate} />
}
