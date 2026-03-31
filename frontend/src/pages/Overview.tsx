import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { dashboard, upcoming as upcomingApi } from '../lib/api'
import MetricCard from '../components/MetricCard'
import Alert from '../components/Alert'
import SavingsChart from '../components/SavingsChart'
import { BellPlus, X } from 'lucide-react'

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
  const [showReminderForm, setShowReminderForm] = useState(false)
  const [reminderAddress, setReminderAddress] = useState('')
  const [reminderDate, setReminderDate] = useState(() => new Date().toISOString().split('T')[0])
  const [reminderTime, setReminderTime] = useState(() => {
    const d = new Date()
    d.setHours(d.getHours() + 1, 0, 0, 0)
    return `${String(d.getHours()).padStart(2, '0')}:00`
  })
  const [reminderErr, setReminderErr] = useState('')

  async function handleAddReminder(e: React.FormEvent) {
    e.preventDefault()
    setReminderErr('')
    if (!reminderAddress.trim()) { setReminderErr('Address is required'); return }
    await upcomingApi.add({ address: reminderAddress.trim(), datetime: `${reminderDate}T${reminderTime}:00` })
    qc.invalidateQueries({ queryKey: ['upcoming'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
    setReminderAddress(''); setShowReminderForm(false)
  }

  if (isLoading) return (
    <div className="space-y-6 animate-pulse">
      <div className="skeleton h-24 w-full rounded-3xl" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
    : settings.loan_bank ? settings.loan_bank : 'Bank'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Overview</h1>
        <p className="text-sm text-green-600 font-medium mt-0.5">
          Welcome back{settings.p1_name ? <>, <span className="font-semibold">{settings.p1_name}{settings.p2_name ? ` & ${settings.p2_name}` : ''}</span></> : ''} — your journey at a glance!
        </p>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Combined Savings"
          value={`${kpis.current_savings.toLocaleString('sv-SE')} kr`}
          sub={`Target: ${kpis.target.toLocaleString('sv-SE')} kr`}
          progress={kpis.savings_pct}
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Loan Promise"
          value={settings.loan_amount ? `${settings.loan_amount.toLocaleString('sv-SE')} kr` : '0 kr'}
          sub={loanSub}
        />
        <MetricCard
          label="Viewings"
          value={String(kpis.total_viewings)}
          sub="apartments viewed so far"
        />
        <MetricCard
          label="Bids Placed"
          value={String(kpis.bids_gone)}
          sub="apartments you've bid on"
        />
      </div>

      {/* Chart + Upcoming */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Savings chart */}
        <div className="md:col-span-3 card">
          <h3 className="section-label">Forecast</h3>
          <SavingsChart data={projection} />
        </div>

        {/* Upcoming viewings */}
        <div className="md:col-span-2 card flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-label !mb-0">Upcoming Viewings</h3>
            {showReminderForm && (
              <button
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all"
                onClick={() => setShowReminderForm(false)}
                title="Cancel"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {showReminderForm && (
            <form onSubmit={handleAddReminder} className="mb-4 space-y-2 p-3 bg-teal-50 rounded-2xl border border-teal-100">
              <input
                className="input !text-sm"
                placeholder="Address…"
                value={reminderAddress}
                onChange={e => setReminderAddress(e.target.value)}
                autoFocus
              />
              <div className="grid grid-cols-2 gap-2">
                <input type="date" className="input !text-sm" value={reminderDate} min={new Date().toISOString().split('T')[0]} onChange={e => setReminderDate(e.target.value)} />
                <input type="time" className="input !text-sm" value={reminderTime} onChange={e => setReminderTime(e.target.value)} />
              </div>
              {reminderErr && <p className="text-xs text-red-400">{reminderErr}</p>}
              <button type="submit" className="btn-primary w-full justify-center">Save</button>
            </form>
          )}

          {upcoming.length === 0 && !showReminderForm ? (
            <div className="flex flex-col items-center justify-center flex-1 py-6 text-center space-y-3">
              <button
                onClick={() => setShowReminderForm(true)}
                className="w-9 h-9 rounded-xl bg-teal-600 hover:bg-teal-700 flex items-center justify-center shadow-sm transition-all active:scale-95"
              >
                <BellPlus size={16} className="text-white" />
              </button>
              <p className="text-xs text-gray-400 font-medium">No upcoming reminders</p>
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

    </div>
  )
}
