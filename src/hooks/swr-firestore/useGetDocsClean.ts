import { useGetDocs } from '@tatsuokaniwa/swr-firestore'
import { useEffect, useMemo } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { getCleanData } from './utils'

export default function useGetDocsClean<T = unknown>(...args: Parameters<typeof useGetDocs<T>>) {
    const { hasFirebaseAuth } = useAuth()

    const guardedArgs = (hasFirebaseAuth ? args : [null]) as Parameters<typeof useGetDocs<T>>

    const { data, error, ...rest } = useGetDocs<T>(...guardedArgs)

    useEffect(() => {
        if (error) {
            console.error('[useGetDocsClean] error', { path: args[0] && args[0].path, error })
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
