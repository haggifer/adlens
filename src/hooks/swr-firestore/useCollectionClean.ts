import { useCollection } from '@tatsuokaniwa/swr-firestore'
import { useEffect, useMemo } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { getCleanData } from './utils'

export default function useCollectionClean<T = unknown>(...args: Parameters<typeof useCollection<T>>) {
    const { hasFirebaseAuth } = useAuth()

    const guardedArgs = (hasFirebaseAuth ? args : [null]) as Parameters<typeof useCollection<T>>

    const { data, error, ...rest } = useCollection<T>(...guardedArgs)

    useEffect(() => {
        if (error) {
            console.error('[useCollectionClean] error', { path: args[0] && args[0].path, error })
        }
    }, [error, args])

    const cleanData = useMemo(() => {
        return getCleanData<T>(data) as T[] | undefined
    }, [data])

    return {
        data: cleanData,
        error,
        ...rest,
    }
}
