import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import type { User } from '@supabase/supabase-js'
import type { AppData } from '../types'
import {
  convertCloudToLocalPayload,
  convertLocalToCloudPayload,
  hasCloudBudgetData,
  type CloudBudgetPayload,
} from '../lib/cloudSync'
import { detectLocalCloudState, mergeLocalAndCloudData, type SyncState } from '../lib/syncMerge'
import { fetchCloudBudgetData, uploadCloudBudgetData } from '../lib/supabaseBudget'

export type CloudSyncStatus = {
  userEmail: string | null
  cloud: CloudBudgetPayload | null
  state: SyncState
  loading: boolean
  error: string
  message: string
  lastCloudSyncAt: string | null
  uploadLocalToCloud: () => Promise<void>
  downloadCloudToLocal: () => Promise<void>
  mergeLocalAndCloud: () => Promise<void>
  refreshCloud: () => Promise<void>
}

export function useCloudSync({
  user,
  data,
  setData,
}: {
  user: User | null
  data: AppData
  setData: Dispatch<SetStateAction<AppData>>
}): CloudSyncStatus {
  const [cloud, setCloud] = useState<CloudBudgetPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const refreshCloud = useCallback(async () => {
    if (!user) {
      setCloud(null)
      return
    }
    setLoading(true)
    setError('')
    try {
      const payload = await fetchCloudBudgetData(user.id)
      setCloud(payload)
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Cloud sync status could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshCloud()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [refreshCloud])

  const uploadLocalToCloud = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const payload = convertLocalToCloudPayload(data, user.id)
      const nextCloud = await uploadCloudBudgetData(user.id, payload)
      setCloud(nextCloud)
      setMessage('Local data was uploaded to cloud sync.')
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Local data could not be uploaded.')
    } finally {
      setLoading(false)
    }
  }, [data, user])

  const downloadCloudToLocal = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const payload = cloud ?? (await fetchCloudBudgetData(user.id))
      const localData = convertCloudToLocalPayload(payload)
      if (!localData || !hasCloudBudgetData(payload)) {
        setMessage('There is no cloud budget data to restore yet.')
        return
      }
      setData(localData)
      setCloud(payload)
      setMessage('Cloud data was downloaded to this device.')
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Cloud data could not be downloaded.')
    } finally {
      setLoading(false)
    }
  }, [cloud, setData, user])

  const mergeLocalAndCloud = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const payload = cloud ?? (await fetchCloudBudgetData(user.id))
      const merged = mergeLocalAndCloudData(data, payload)
      setData(merged)
      const nextCloud = await uploadCloudBudgetData(user.id, convertLocalToCloudPayload(merged, user.id))
      setCloud(nextCloud)
      setMessage('Local and cloud data were merged, then uploaded.')
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Local and cloud data could not be merged.')
    } finally {
      setLoading(false)
    }
  }, [cloud, data, setData, user])

  const state = useMemo(() => detectLocalCloudState(data, cloud), [cloud, data])

  return {
    userEmail: user?.email ?? null,
    cloud,
    state,
    loading,
    error,
    message,
    lastCloudSyncAt: cloud?.metadata?.last_sync_at ?? null,
    uploadLocalToCloud,
    downloadCloudToLocal,
    mergeLocalAndCloud,
    refreshCloud,
  }
}
