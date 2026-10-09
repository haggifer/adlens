import type { Quota } from 'adlens-shared'

// "2/3 analyses left", or "Unlimited analyses" for an admin (no limit).
export const formatQuotaLeft = ({ used, limit }: Quota): string =>
    limit === null ? 'Unlimited analyses' : `${Math.max(limit - used, 0)}/${limit} analyses left`

// "Oct 16, 9:30 AM" in the viewer's time zone. English like the rest of the UI, not the browser's language, so the date
// never reads "16 окт." in an English sentence.
export const formatQuotaDate = (isoDate: string): string =>
    new Date(isoDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

// When the oldest counted analysis stops counting; null while none counts, and for an admin (no limit).
export const getQuotaResetDate = ({ limit, nextFreeAt }: Quota): string | null =>
    limit === null || nextFreeAt === null ? null : formatQuotaDate(nextFreeAt)
