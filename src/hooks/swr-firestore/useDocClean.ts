import { useDoc } from '@tatsuokaniwa/swr-firestore'
import { useEffect, useMemo } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { getCleanData } from './utils'

export default function useDocClean<T = unknown>(...args: Parameters<typeof useDoc<T>>) {
    const { hasFirebaseAuth } = useAuth()

    const guardedArgs = (hasFirebaseAuth ? args : [null]) as Parameters<typeof useDoc<T>>

    const { data, error, ...rest } = useDoc<T>(...guardedArgs)

    useEffect(() => {
        if (error) {
            console.error('[useDocClean] error', { path: args[0] && args[0].path, error })
        }
    }, [error, args])

    const cleanData = useMemo(() => {
        return getCleanData<T>(data) as T | undefined
    }, [data])

    return {
        data: cleanData,
        error,
        ...rest,
    }
}
