import { toAnchorId } from './anchor'

describe('toAnchorId', () => {
    it('drops the section number and slugifies the heading', () => {
        expect(toAnchorId('4. Prohibited activities')).toBe('prohibited-activities')
    })

    it('collapses punctuation into single dashes', () => {
        expect(toAnchorId('17. Electronic communications, transactions, and signatures')).toBe(
            'electronic-communications-transactions-and-signatures',
        )
        expect(toAnchorId('What information do we collect?')).toBe('what-information-do-we-collect')
    })
})
