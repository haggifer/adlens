export const formatUsage = (count: number): string => {
    if (count === 0) {
        return 'Not used'
    }

    return `Used ${count} ${count === 1 ? 'time' : 'times'}`
}
