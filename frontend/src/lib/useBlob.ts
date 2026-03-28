import { useQuery, useQueryClient } from '@tanstack/react-query'
import { blobs } from './api'

/**
 * Syncs a JSON array to Supabase user_blobs.
 * Returns [data, save] — save() updates the cache optimistically then persists.
 * If no data exists yet (null from API), falls back to the provided default.
 */
export function useBlob<T>(key: string, fallback: T): [T, (data: T) => void] {
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['blob', key],
    queryFn: () => blobs.get<T>(key),
  })

  // null = never saved (new user) → show fallback
  // undefined = still loading → show fallback
  const value = (data === null || data === undefined) ? fallback : data

  function save(newData: T) {
    qc.setQueryData(['blob', key], newData)  // optimistic — instant UI
    blobs.set(key, newData).catch(() => {
      qc.invalidateQueries({ queryKey: ['blob', key] })
    })
  }

  return [value, save]
}
