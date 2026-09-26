import { render, screen } from '@testing-library/react'
import Field from './Field'

describe('Field', () => {
    it('shows the hint while there is no error', () => {
        render(
            <Field label="Password" hint="At least 8 characters">
                <input />
            </Field>,
        )

        expect(screen.getByText('At least 8 characters')).toBeInTheDocument()
    })

    it('replaces the hint with the error', () => {
        render(
            <Field label="Password" hint="At least 8 characters" error="Passwords do not match">
                <input />
            </Field>,
        )

        expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
        expect(screen.queryByText('At least 8 characters')).not.toBeInTheDocument()
    })
})
