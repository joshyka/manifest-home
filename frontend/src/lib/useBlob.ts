import { useQuery, useQueryClient } from '@tanstack/react-query'
import { blobs } from './api'
import { isEncryptionEnabled, getSessionPassphrase, encryptData, decryptData, isEncryptedBlob } from './crypto'

export function useBlob<T>(key: string, fallback: T): [T, (data: T) => void] {
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['blob', key],
    queryFn: async () => {
      const raw = await blobs.get<any>(key)
      if (raw === null || raw === undefined) return null
      if (isEncryptionEnabled() && getSessionPassphrase() && isEncryptedBlob(raw)) {
        try { return await decryptData(raw as string, getSessionPassphrase()!) }
        catch { return null }
      }
      return raw
    },
  })

  const value = (data === null || data === undefined) ? fallback : data as T

  function save(newData: T) {
    qc.setQueryData(['blob', key], newData)
    const persist = async () => {
      if (isEncryptionEnabled() && getSessionPassphrase()) {
        const encrypted = await encryptData(newData, getSessionPassphrase()!)
        await blobs.set(key, encrypted as any)
      } else {
        await blobs.set(key, newData)
      }
    }
    persist().catch(() => qc.invalidateQueries({ queryKey: ['blob', key] }))
  }

  return [value, save]
}
