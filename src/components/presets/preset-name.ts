// The API's name rule: names are trimmed and compared ignoring case.
const toNameKey = (name: string) => name.trim().toLowerCase()

export const isSameName = (a: string, b: string): boolean => toNameKey(a) === toNameKey(b)
