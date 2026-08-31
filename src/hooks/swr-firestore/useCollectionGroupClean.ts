import { useCollectionGroup } from '@tatsuokaniwa/swr-firestore'
import { useEffect, useMemo } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { getCleanData } from './utils'

export default function useCollectionGroupClean<T = unknown>(...args: Parameters<typeof useCollectionGroup<T>>) {
    const { hasFirebaseAuth } = useAuth()

    const guardedArgs = (hasFirebaseAuth ? args : [null]) as Parameters<typeof useCollectionGroup<T>>

    const { data, error, ...rest } = useCollectionGroup<T>(...guardedArgs)

    useEffect(() => {
        if (error) {
            console.error('[useCollectionGroupClean] error', { path: args[0] && args[0].path, error })
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
