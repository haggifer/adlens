import { render, screen } from '@testing-library/react'
import { Field } from './Field'

const INPUT_ID = 'password'

describe('Field', () => {
    it('names the input it labels', () => {
        render(
            <Field label="Password" htmlFor={INPUT_ID}>
                <input id={INPUT_ID} />
            </Field>,
        )

        expect(screen.getByRole('textbox', { name: 'Password' })).toBeInTheDocument()
    })

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
