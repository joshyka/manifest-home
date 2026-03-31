import { useQuery } from '@tanstack/react-query'

async function fetchRiksbankRate(): Promise<number | null> {
  const res = await fetch(
    'https://api.riksbank.se/swea/v1/observations/SEMB5YCACOMB/latest',
    { headers: { Accept: 'application/json' } }
  )
  if (!res.ok) return null
  const data = await res.json()
  // Response: [{ date, value }] or { date, value }
  const raw = Array.isArray(data) ? data[0]?.value : data?.value
  const num = parseFloat(raw)
  return isNaN(num) ? null : Math.round(num * 10) / 10
}

export function useRiksbankRate() {
  return useQuery<number | null>({
    queryKey: ['riksbank-rate'],
    queryFn: fetchRiksbankRate,
    staleTime: 1000 * 60 * 60 * 24, // cache 24h — rate doesn't change intraday
    retry: 1,
  })
}
