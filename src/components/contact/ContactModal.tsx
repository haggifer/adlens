'use client'

import { useContactModalStore } from '@/contexts/stores/contactModalStore'
import { MODAL_WIDTH } from '@/design/theme'
import { Modal } from 'antd'
import { ContactForm } from './ContactForm'

export function ContactModal() {
    const isOpen = useContactModalStore((s) => s.isOpen)
    const setIsOpen = useContactModalStore((s) => s.setIsOpen)

    return (
        <Modal
            open={isOpen}
            onCancel={() => setIsOpen(false)}
            footer={null}
            width={MODAL_WIDTH}
            centered
            destroyOnHidden
            title="Contact us"
        >
            <ContactForm onDone={() => setIsOpen(false)} />
        </Modal>
    )
}
