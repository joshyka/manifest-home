import { supabase } from './supabase'

// In production VITE_API_URL points to the Render backend; in dev the Vite proxy handles /api
const BASE = import.meta.env.VITE_API_URL
  ? `${(import.meta.env.VITE_API_URL as string).replace(/\/$/, '')}/api`
  : '/api'

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const ah = await authHeaders()
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...ah, ...opts?.headers },
    ...opts,
  })
  if (res.status === 401) {
    await supabase.auth.signOut()
    window.location.href = '/'
    throw new Error('Session expired')
  }
  if (res.status === 403) {
    throw new Error('403')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'Request failed')
  }
  return res.json()
}

// ── Types ──────────────────────────────────────────────────────────────────────
export interface Settings {
  p1_name: string
  p2_name: string
  p1_current: number
  p2_current: number
  p1_monthly: number
  p2_monthly: number
  loan_amount: number
  loan_expiry: string
  loan_bank: string
  apartment_price: number
  down_pct: number
}

export interface LoanStatus {
  status: 'ok' | 'expiring_soon' | 'expired' | 'none'
  days: number | null
}

export interface ProjectionRow {
  month: string
  month_num: number
  cumulative: number
  target: number
  gap: number
  is_current: boolean
}

export interface UpcomingViewing {
  id: string
  address: string
  datetime: string
  area: string
  asking_price: string
  notes: string
}

export interface DashboardData {
  settings: Settings
  kpis: {
    current_savings: number
    target: number
    savings_pct: number
    loan_status: LoanStatus
    total_viewings: number
    bids_gone: number
  }
  projection: ProjectionRow[]
  upcoming: UpcomingViewing[]
}

export interface Viewing {
  id: string
  address: string
  date: string
  outcome: string
  num_bid_rounds: number
  final_price: string
  my_bid: string
  notes: string
  hemnet_url: string
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
export const dashboard = {
  get: () => request<DashboardData>('/dashboard'),
}

// ── Settings ───────────────────────────────────────────────────────────────────
export const settings = {
  get: () => request<Settings>('/settings'),
  update: (data: Settings) =>
    request<{ settings: Settings; projection: ProjectionRow[] }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
}

// ── Viewings ───────────────────────────────────────────────────────────────────
export const viewings = {
  list: () => request<Viewing[]>('/viewings'),
  add: (data: {
    address: string
    date: string
    hemnet_url?: string
    outcome?: string
    num_bid_rounds?: number
    final_price?: string
    my_bid?: string
    notes?: string
  }) =>
    request<{ ok: boolean; id: string }>('/viewings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: { outcome: string; num_bid_rounds: number; final_price: string; my_bid: string; notes: string }) =>
    request<{ ok: boolean }>(`/viewings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  archive: (id: string) =>
    request<{ ok: boolean }>(`/viewings/${id}/archive`, { method: 'PUT' }),
}

// ── Upcoming ───────────────────────────────────────────────────────────────────
export const upcoming = {
  list: () => request<UpcomingViewing[]>('/upcoming'),
  add: (data: { address: string; datetime: string; area?: string; asking_price?: string; notes?: string }) =>
    request<{ ok: boolean; id: string }>('/upcoming', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    request<{ ok: boolean }>(`/upcoming/${id}`, { method: 'DELETE' }),
}

// ── Listing fetcher ────────────────────────────────────────────────────────────
export interface FetchedListing {
  name: string
  price: number | null
  sqm: number | null
  rooms: number | null
  image: string
  site: string
  description: string
  partial?: boolean
}

export const listings = {
  fetch: (url: string) =>
    request<FetchedListing>('/fetch-listing', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),
}

// ── Blobs (checklist, comparison, calc snapshots) ──────────────────────────────
export const blobs = {
  get: <T>(key: string) => request<T | null>(`/blob/${key}`),
  set: <T>(key: string, data: T) =>
    request<{ ok: boolean }>(`/blob/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    }),
}

// ── Target areas ───────────────────────────────────────────────────────────────
export interface TargetArea {
  id: string
  name: string
  priority: string
  notes: string
}

export const targetAreas = {
  list: () => request<TargetArea[]>('/target-areas'),
  add: (data: { name: string; priority: string; notes: string }) =>
    request<{ ok: boolean; id: string }>('/target-areas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: { name: string; priority: string; notes: string }) =>
    request<{ ok: boolean }>(`/target-areas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    request<{ ok: boolean }>(`/target-areas/${id}`, { method: 'DELETE' }),
}

// ── Data management ────────────────────────────────────────────────────────────
export const data = {
  clear: () => request<{ ok: boolean }>('/data', { method: 'DELETE' }),
}
