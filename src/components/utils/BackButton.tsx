'use client'

import { useNavigationStore } from '@/contexts/stores/navigationStore'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { useRouter } from 'next/navigation'

interface IProps {
    // Where to go when the page was opened directly (a new tab, an email link) and there is no in-app page to return to.
    fallbackHref: string
}

export function BackButton({ fallbackHref }: IProps) {
    const router = useRouter()
    const hasNavigated = useNavigationStore((s) => s.hasNavigated)

    const handleBack = () => (hasNavigated ? router.back() : router.push(fallbackHref))

    return (
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
            Back
        </Button>
    )
}
