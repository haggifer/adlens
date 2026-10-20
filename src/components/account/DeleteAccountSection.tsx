'use client'

import { MODAL_WIDTH } from '@/design/theme'
import { Button, Modal } from 'antd'
import { useState } from 'react'
import { DeleteAccountForm } from './DeleteAccountForm'
import { useStyles } from './styles'

const TITLE = 'Delete account'

interface IProps {
    hasPassword: boolean
}

export function DeleteAccountSection({ hasPassword }: IProps) {
    const { styles, cx } = useStyles()

    const [isOpen, setIsOpen] = useState(false)

    const handleClose = () => setIsOpen(false)

    return (
        <div className={cx(styles.section, styles.dangerSection)}>
            <h2 className={styles.sectionTitle}>{TITLE}</h2>
            <div>
                <Button danger onClick={() => setIsOpen(true)}>
                    {TITLE}
                </Button>
            </div>
            <Modal
                open={isOpen}
                onCancel={handleClose}
                footer={null}
                width={MODAL_WIDTH}
                centered
                // A new form each time, so a password typed before a cancel doesn't come back.
                destroyOnHidden
                title={<span className={styles.sectionTitle}>{TITLE}</span>}
            >
                <DeleteAccountForm hasPassword={hasPassword} onClose={handleClose} />
            </Modal>
        </div>
    )
}
