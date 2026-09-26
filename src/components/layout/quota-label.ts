import type { Quota } from 'adlens-shared'

// "2/3 analyses left", or "Unlimited analyses" for an admin (no limit).
export const formatQuotaLeft = ({ used, limit }: Quota): string =>
    limit === null ? 'Unlimited analyses' : `${Math.max(limit - used, 0)}/${limit} analyses left`
