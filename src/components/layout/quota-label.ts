import type { Quota } from 'adlens-shared'

// "2/3 analyses left", or "Unlimited analyses" for an admin (no limit).
export const formatQuotaLeft = ({ used, limit }: Quota): string =>
    limit === null ? 'Unlimited analyses' : `${Math.max(limit - used, 0)}/${limit} analyses left`

const QUOTA_DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
})

const readDatePart = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? ''

// "Jan 23 09:27" in the viewer's time zone. English like the rest of the UI, not the browser's language, so the date
// never reads "23 янв." in an English sentence; built from parts, since en-US puts a comma after the day.
export const formatQuotaDate = (isoDate: string): string => {
    const parts = QUOTA_DATE_FORMAT.formatToParts(new Date(isoDate))
    const read = (type: Intl.DateTimeFormatPartTypes) => readDatePart(parts, type)

    return `${read('month')} ${read('day')} ${read('hour')}:${read('minute')}`
}

// When the oldest counted analysis stops counting. The window is rolling, so that frees one analysis, not the whole
// allowance. Null while none counts, and for an admin (no limit).
export const describeNextFree = ({ limit, nextFreeAt }: Quota): string | null => {
    if (limit === null || nextFreeAt === null) {
        return null
    }

    return `Resets on ${formatQuotaDate(nextFreeAt)}`
}
