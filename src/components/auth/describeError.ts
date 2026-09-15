export const describeError = (error: { message?: string } | null): string =>
    error?.message || 'Something went wrong. Please try again.'
