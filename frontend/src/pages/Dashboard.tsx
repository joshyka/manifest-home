import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { dashboard, data as dataApi } from '../lib/api'
import MetricCard from '../components/MetricCard'
import Alert from '../components/Alert'
import SavingsChart from '../components/SavingsChart'
import { Clock, Trash2 } from 'lucide-react'

function formatDaysAway(dt: string): string {
  const d = new Date(dt)
  const now = new Date()
  const days = Math.round((d.getTime() - now.getTime()) / 86_400_000)
  if (days < 0) return 'Past'
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `${days}d`
}

export default function Dashboard() {
  const qc = useQueryClient()
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboard'], queryFn: dashboard.get })
  const [confirmClear, setConfirmClear] = useState(false)

  async function handleClear() {
    await dataApi.clear()
    localStorage.removeItem('kj_comparison_items')
    localStorage.removeItem('kj_saved_comparisons')
    qc.invalidateQueries()
    setConfirmClear(false)
  }

  if (isLoading) return (
    <div className="space-y-6 animate-pulse">
      <div className="skeleton h-24 w-full rounded-3xl" />
      <div className="grid grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-28 rounded-3xl" />)}
      </div>
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 skeleton h-72 rounded-3xl" />
        <div className="col-span-2 skeleton h-72 rounded-3xl" />
      </div>
    </div>
  )

  if (error) return (
    <Alert kind="danger">Failed to load dashboard. Is the backend running?</Alert>
  )

  const { kpis, projection, upcoming, settings } = data!
  const ls = kpis.loan_status

  const loanSub = ls.status === 'ok'
    ? `Valid — ${ls.days} days left`
    : ls.status === 'expiring_soon'
    ? `Expiring soon — ${ls.days} days`
    : ls.status === 'expired'
    ? 'Expired — renew immediately'
    : 'Enter in Savings page'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Your home buying journey at a glance</p>
      </div>

      {/* Alerts */}
      <div className="space-y-2">
        {ls.status === 'expired' && (
          <Alert kind="danger">
            Your <strong>lånelöfte has expired</strong>. Renew it immediately before making any bids.
          </Alert>
        )}
        {ls.status === 'expiring_soon' && (
          <Alert kind="warning">
            Your lånelöfte expires in <strong>{ls.days} days</strong>. Contact your bank to renew soon.
          </Alert>
        )}
        {kpis.savings_pct >= 100 && (
          <Alert kind="success">
            You've reached your down payment target. Time to get serious about bidding!
          </Alert>
        )}
      </div>

      {/* KPI row 1 */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          label="Combined Savings"
          value={`${kpis.current_savings.toLocaleString('sv-SE')} kr`}
          sub={`Target: ${kpis.target.toLocaleString('sv-SE')} kr`}
          progress={kpis.savings_pct}
          accent
        />
        <MetricCard
          label="Down Payment Target"
          value={`${kpis.target.toLocaleString('sv-SE')} kr`}
          sub={`${settings.down_pct}% of ${(settings.apartment_price / 1e6).toFixed(1)}M SEK`}
        />
        <MetricCard
          label="Progress"
          value={`${kpis.savings_pct.toFixed(1)}%`}
          sub={kpis.savings_pct >= 100
            ? 'Target met!'
            : `${(kpis.target - kpis.current_savings).toLocaleString('sv-SE')} kr to go`}
          progress={kpis.savings_pct}
        />
      </div>

      {/* KPI row 2 */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          label="Lånelöfte Amount"
          value={settings.loan_amount ? `${settings.loan_amount.toLocaleString('sv-SE')} kr` : 'Not entered'}
          sub={loanSub}
        />
        <MetricCard
          label="Total Viewings"
          value={String(kpis.total_viewings)}
          sub="apartments viewed so far"
        />
        <MetricCard
          label="Bidding Attempts"
          value={String(kpis.bids_gone)}
          sub="apartments you've bid on"
        />
      </div>

      {/* Chart + Upcoming */}
      <div className="grid grid-cols-5 gap-4">
        {/* Savings chart */}
        <div className="col-span-3 card">
          <h3 className="text-base font-bold text-gray-900 mb-4">Savings Projection 2026</h3>
          <SavingsChart data={projection} />
        </div>

        {/* Upcoming viewings */}
        <div className="col-span-2 card">
          <h3 className="text-base font-bold text-gray-900 mb-4">Upcoming Viewings</h3>
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <Clock size={28} className="text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">No upcoming viewings.<br/>Add them in the Viewings page.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map(uv => {
                const label = formatDaysAway(uv.datetime)
                const dt = new Date(uv.datetime)
                const dtStr = dt.toLocaleDateString('en-SE', { weekday: 'short', day: 'numeric', month: 'short' })
                  + ', ' + dt.toLocaleTimeString('en-SE', { hour: '2-digit', minute: '2-digit' })
                return (
                  <div key={uv.id} className="flex items-start gap-3 p-3 bg-teal-50 rounded-2xl border border-teal-100/60 hover:border-teal-200 transition-colors">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                         style={{ background: 'linear-gradient(135deg, #2E7D52, #3DAA6E)' }}>
                      <span className="text-white font-bold text-xs text-center leading-tight">{label}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 text-sm truncate">{uv.address}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{dtStr}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Clear data */}
      <div className="card">
        <div className="flex gap-3">
          {!confirmClear ? (
            <button className="btn-danger ml-auto" onClick={() => setConfirmClear(true)}>
              <Trash2 size={14} /> Clear Data
            </button>
          ) : (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-red-600 font-medium">Delete all data?</span>
              <button className="btn-danger" onClick={handleClear}>
                Yes, delete
              </button>
              <button className="btn-secondary" onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
