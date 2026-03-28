import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { dashboard, data as dataApi, viewings as viewingsApi, upcoming as upcomingApi, settings as settingsApi, targetAreas as targetAreasApi, blobs } from '../lib/api'
import MetricCard from '../components/MetricCard'
import Alert from '../components/Alert'
import SavingsChart from '../components/SavingsChart'
import { Clock, Trash2, Download, Upload } from 'lucide-react'

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
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleClear() {
    await dataApi.clear()
    // Invalidate all blob caches so pages reload with empty/default state
    qc.removeQueries({ queryKey: ['blob'] })
    qc.invalidateQueries()
    setConfirmClear(false)
  }

  async function handleExport() {
    const [vs, us, s, targetAreas, checklist, comparison, savedComps, calcSnaps] = await Promise.all([
      viewingsApi.list(),
      upcomingApi.list(),
      settingsApi.get(),
      targetAreasApi.list(),
      blobs.get<any[]>('checklist'),
      blobs.get<any[]>('comparison_items'),
      blobs.get<any[]>('saved_comparisons'),
      blobs.get<any[]>('calc_snapshots'),
    ])

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([s]),         'Settings')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vs),          'Viewings')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(us),          'Upcoming')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(checklist   ?? []), 'Checklist')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(comparison  ?? []), 'Comparison')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(savedComps  ?? []), 'Saved Comparisons')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(calcSnaps   ?? []), 'Calculator')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(targetAreas), 'Target Areas')
    XLSX.writeFile(wb, `keyjourney-${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportMsg('')
    try {
      const buf = await file.arrayBuffer()
      const wb  = XLSX.read(buf, { type: 'array' })

      const settingsSheet   = wb.Sheets['Settings']
      const viewingsSheet   = wb.Sheets['Viewings']
      const upcomingSheet   = wb.Sheets['Upcoming']
      const checklistSheet  = wb.Sheets['Checklist']
      const compSheet       = wb.Sheets['Comparison']
      const savedCompSheet  = wb.Sheets['Saved Comparisons']

      // Clear all existing data first
      await dataApi.clear()
      qc.removeQueries({ queryKey: ['blob'] })

      // Import settings
      if (settingsSheet) {
        const rows = XLSX.utils.sheet_to_json<any>(settingsSheet)
        if (rows[0]) await settingsApi.update(rows[0])
      }

      // Import viewings
      if (viewingsSheet) {
        const rows = XLSX.utils.sheet_to_json<any>(viewingsSheet)
        for (const r of rows) {
          await viewingsApi.add({
            address:        r.address  || '',
            date:           r.date     || '',
            hemnet_url:     r.hemnet_url || '',
            outcome:        r.outcome  || 'Viewed — no bid',
            num_bid_rounds: r.num_bid_rounds || 0,
            final_price:    r.final_price ? String(r.final_price) : '',
            my_bid:         r.my_bid   ? String(r.my_bid) : '',
            notes:          r.notes    || '',
          })
        }
      }

      // Import upcoming
      if (upcomingSheet) {
        const rows = XLSX.utils.sheet_to_json<any>(upcomingSheet)
        for (const r of rows) {
          await upcomingApi.add({
            address:      r.address      || '',
            datetime:     r.datetime     || '',
            area:         r.area         || '',
            asking_price: r.asking_price || '',
            notes:        r.notes        || '',
          })
        }
      }

      const calcSheet = wb.Sheets['Calculator']

      // Restore blob data via API
      if (checklistSheet)
        await blobs.set('checklist',           XLSX.utils.sheet_to_json(checklistSheet))
      if (compSheet)
        await blobs.set('comparison_items',    XLSX.utils.sheet_to_json(compSheet))
      if (savedCompSheet)
        await blobs.set('saved_comparisons',   XLSX.utils.sheet_to_json(savedCompSheet))
      if (calcSheet)
        await blobs.set('calc_snapshots',      XLSX.utils.sheet_to_json(calcSheet))

      // Import target areas via API
      const areasSheet = wb.Sheets['Target Areas']
      if (areasSheet) {
        const rows = XLSX.utils.sheet_to_json<any>(areasSheet)
        for (const r of rows) {
          await targetAreasApi.add({
            name:     r.name     || '',
            priority: r.priority || 'Medium',
            notes:    r.notes    || '',
          })
        }
      }

      qc.invalidateQueries()
      setImportMsg('Import successful.')
    } catch {
      setImportMsg('Import failed — check the file format.')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
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

      {/* Data management */}
      <div className="card space-y-3">
        {importMsg && (
          <Alert kind={importMsg.includes('failed') ? 'danger' : 'success'}>{importMsg}</Alert>
        )}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Export */}
          <button className="btn-secondary" onClick={handleExport}>
            <Download size={14} /> Download
          </button>

          {/* Import */}
          <button className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={importing}>
            <Upload size={14} /> {importing ? 'Importing…' : 'Import'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleImport}
          />

          {/* Clear */}
          <div className="ml-auto">
            {!confirmClear ? (
              <button className="btn-danger" onClick={() => setConfirmClear(true)}>
                <Trash2 size={14} /> Clear Data
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 font-medium">Delete all data?</span>
                <button className="btn-danger" onClick={handleClear}>Yes, delete</button>
                <button className="btn-secondary" onClick={() => setConfirmClear(false)}>Cancel</button>
              </div>
            )}
          </div>
        </div>
        <p className="text-[11px] text-gray-400">Import replaces all existing data. Export downloads Settings, Viewings and Upcoming as an Excel file.</p>
      </div>
    </div>
  )
}
