import { DocumentData } from '@tatsuokaniwa/swr-firestore'
import { omit } from 'es-toolkit'

export const getCleanData = <T>(data?: DocumentData<T> | DocumentData<T>[]): T | T[] | undefined => {
    if (Array.isArray(data)) {
        return (data as DocumentData<T>[]).map((item) => omit(item, ['exists', 'ref'])) as T[]
    } else {
        return data && (omit(data as DocumentData<T>, ['exists', 'ref']) as T)
    }
}
