import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'

const BASE = import.meta.env.VITE_API_URL
  ? `${(import.meta.env.VITE_API_URL as string).replace(/\/$/, '')}/api`
  : '/api'

async function fetchRiksbankRate(): Promise<number | null> {
  const { data: session } = await supabase.auth.getSession()
  const token = session.session?.access_token
  const res = await fetch(`${BASE}/riksbank-rate`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.value ?? null
}

export function useRiksbankRate() {
  return useQuery<number | null>({
    queryKey: ['riksbank-rate'],
    queryFn: fetchRiksbankRate,
    staleTime: 1000 * 60 * 60 * 24, // cache 24h — rate doesn't change intraday
    retry: 1,
  })
}
