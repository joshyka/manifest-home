import { useQuery, useQueryClient } from '@tanstack/react-query'
import { blobs } from './api'

function localKey(key: string) { return `kj_blob_${key}` }

function readLocalCache<T>(key: string): T | undefined {
  try {
    const s = localStorage.getItem(localKey(key))
    if (!s) return undefined
    const parsed = JSON.parse(s)
    return Array.isArray(parsed) ? parsed as T : undefined
  } catch { return undefined }
}

function writeLocalCache<T>(key: string, data: T) {
  if (!Array.isArray(data)) return
  try { localStorage.setItem(localKey(key), JSON.stringify(data)) } catch {}
}

export function useBlob<T>(key: string, fallback: T): [T, (data: T) => void] {
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['blob', key],
    staleTime: 5 * 60 * 1000,
    initialData: () => readLocalCache<T>(key),
    initialDataUpdatedAt: 0,
    queryFn: async () => {
      const raw = await blobs.get<any>(key)
      if (raw === null || raw === undefined) return null
      if (Array.isArray(raw)) {
        try { localStorage.setItem(localKey(key), JSON.stringify(raw)) } catch {}
      }
      return raw
    },
  })

  const value = (data === null || data === undefined) ? fallback : data as T

  function save(newData: T) {
    writeLocalCache(key, newData)
    qc.setQueryData(['blob', key], newData)
    blobs.set(key, newData).catch(() => qc.invalidateQueries({ queryKey: ['blob', key] }))
  }

  return [value, save]
}
