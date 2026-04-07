import { useState, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { Trash2, Users, Copy, Check } from 'lucide-react'
import { dashboard, data as dataApi, viewings as viewingsApi, upcoming as upcomingApi, settings as settingsApi, targetAreas as targetAreasApi, blobs, household as householdApi } from '../lib/api'
import type { HouseholdStatus } from '../lib/api'
import Alert from '../components/Alert'

export default function Settings() {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const [msgKind, setMsgKind] = useState<'success' | 'danger'>('success')
  const [importing, setImporting] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  // Household state
  const [hh, setHh] = useState<HouseholdStatus | null>(null)
  const [hhBusy, setHhBusy] = useState(false)
  const [hhErr, setHhErr] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [codeCopied, setCodeCopied] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')
  const [hhMode, setHhMode] = useState<'none' | 'share' | 'join'>('none')

  useEffect(() => {
    householdApi.status().then(setHh).catch((e: any) => setHhErr(e.message ?? 'Failed to load household status'))
  }, [])

  useEffect(() => {
    if (!hh?.invite_expires_at) return
    const tick = () => {
      const diff = new Date(hh.invite_expires_at!).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('Expired'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setTimeLeft(`${h}h ${m}m`)
    }
    tick()
    const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, [hh?.invite_expires_at])

  async function handleCreateHousehold() {
    setHhBusy(true); setHhErr('')
    try { setHh(await householdApi.create()) } catch (e: any) { setHhErr(e.message) }
    setHhBusy(false)
  }

  async function handleJoin() {
    if (!joinCode.trim()) return
    setHhBusy(true); setHhErr('')
    try {
      await householdApi.join(joinCode.trim())
      setHh(await householdApi.status())
      setJoinCode('')
    } catch (e: any) { setHhErr(e.message) }
    setHhBusy(false)
  }

  async function handleLeave() {
    setHhBusy(true); setHhErr('')
    try { await householdApi.leave(); setHh(await householdApi.status()) } catch (e: any) { setHhErr(e.message) }
    setHhBusy(false)
  }

  async function handleRemovePartner() {
    setHhBusy(true); setHhErr('')
    try { await householdApi.removePartner(); setHh(await householdApi.status()) } catch (e: any) { setHhErr(e.message) }
    setHhBusy(false)
  }

  async function handleRegenerate() {
    setHhBusy(true); setHhErr('')
    try { setHh(await householdApi.regenerate()) } catch (e: any) { setHhErr(e.message) }
    setHhBusy(false)
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000)
  }

  function notify(text: string, kind: 'success' | 'danger' = 'success') {
    setMsg(text); setMsgKind(kind)
    setTimeout(() => setMsg(''), 4000)
  }

  // ── Export ────────────────────────────────────────────────────────────────
  async function handleExport() {
    const [vs, us, s, areas, checklist, comparison, savedComps, calcSnaps, brfChecks] = await Promise.all([
      viewingsApi.list(), upcomingApi.list(), settingsApi.get(), targetAreasApi.list(),
      blobs.get<any[]>('checklist'), blobs.get<any[]>('comparison_items'),
      blobs.get<any[]>('saved_comparisons'), blobs.get<any[]>('calc_snapshots'), blobs.get<any[]>('brf_checks'),
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([s]),              'Settings')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vs),               'Viewings')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(us),               'Upcoming')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(checklist  ?? []), 'Checklist')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(comparison ?? []), 'Comparison')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(savedComps ?? []), 'Saved Comparisons')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(calcSnaps  ?? []), 'Calculator')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(areas),            'Target Areas')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(brfChecks  ?? []), 'BRF Checks')
    XLSX.writeFile(wb, `keyjourney-${new Date().toISOString().slice(0, 10)}.xlsx`)
    notify('Export downloaded.')
  }

  // ── Import ────────────────────────────────────────────────────────────────
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const buf = await file.arrayBuffer()
      const wb  = XLSX.read(buf, { type: 'array' })
      await dataApi.clear(); qc.removeQueries({ queryKey: ['blob'] })
      const s = wb.Sheets['Settings']
      if (s) { const rows = XLSX.utils.sheet_to_json<any>(s); if (rows[0]) await settingsApi.update(rows[0]) }
      const vs = wb.Sheets['Viewings']
      if (vs) for (const r of XLSX.utils.sheet_to_json<any>(vs))
        await viewingsApi.add({ address: r.address || '', date: r.date || '', hemnet_url: r.hemnet_url || '', outcome: r.outcome || 'Viewed — no bid', num_bid_rounds: r.num_bid_rounds || 0, final_price: r.final_price ? String(r.final_price) : '', my_bid: r.my_bid ? String(r.my_bid) : '', notes: r.notes || '' })
      const us = wb.Sheets['Upcoming']
      if (us) for (const r of XLSX.utils.sheet_to_json<any>(us))
        await upcomingApi.add({ address: r.address || '', datetime: r.datetime || '' })
      const as_ = wb.Sheets['Target Areas']
      if (as_) for (const r of XLSX.utils.sheet_to_json<any>(as_))
        await targetAreasApi.add({ name: r.name || '', priority: r.priority || 'Medium' })
      for (const [sheet, key] of [['Checklist','checklist'],['Comparison','comparison_items'],['Saved Comparisons','saved_comparisons'],['Calculator','calc_snapshots'],['BRF Checks','brf_checks']] as const) {
        const sh = wb.Sheets[sheet]; if (sh) await blobs.set(key, XLSX.utils.sheet_to_json(sh))
      }
      qc.invalidateQueries(); notify('Import successful.')
    } catch { notify('Import failed — check the file format.', 'danger') }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = '' }
  }

  // ── Clear ─────────────────────────────────────────────────────────────────
  async function handleClear() {
    await dataApi.clear(); qc.removeQueries({ queryKey: ['blob'] }); qc.invalidateQueries()
    setConfirmClear(false); notify('All data deleted.')
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your data and security preferences</p>
      </div>

      {msg && <Alert kind={msgKind}>{msg}</Alert>}
      <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleImport} />

      <div className="card divide-y divide-gray-100 !p-0 overflow-hidden">

        {/* Household */}
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-gray-400" />
            <p className="text-sm font-bold text-gray-700">Household</p>
          </div>
          {hhErr && <p className="text-xs text-red-500">{hhErr}</p>}
          {hh === null && !hhErr && <p className="text-xs text-gray-400">Loading…</p>}

          {hh?.role === 'none' && hhMode === 'none' && (
            <div className="flex gap-2">
              <button className="btn-primary" onClick={() => setHhMode('share')}>Share House</button>
              <button className="btn-secondary" onClick={() => setHhMode('join')}>Join House</button>
            </div>
          )}

          {hh?.role === 'none' && hhMode === 'share' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">Create a household and share the invite code with your partner.</p>
              <div className="flex gap-2">
                <button className="btn-primary" onClick={async () => { await handleCreateHousehold(); setHhMode('none') }} disabled={hhBusy}>
                  {hhBusy ? 'Creating…' : 'Create & get code'}
                </button>
                <button className="btn-secondary" onClick={() => setHhMode('none')}>Cancel</button>
              </div>
            </div>
          )}

          {hh?.role === 'none' && hhMode === 'join' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">Enter the invite code shared by your partner.</p>
              <div className="flex gap-2">
                <input className="input flex-1" placeholder="e.g. X7K2-9QAB" value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())} />
                <button className="btn-primary" onClick={handleJoin} disabled={hhBusy || !joinCode.trim()}>
                  {hhBusy ? 'Joining…' : 'Join'}
                </button>
              </div>
              <button className="text-xs text-gray-400 hover:text-gray-600" onClick={() => { setHhMode('none'); setJoinCode('') }}>Cancel</button>
            </div>
          )}

          {hh?.role === 'owner' && !hh.partner_id && hh.invite_code && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">Share this code with your partner. Expires in <span className="font-semibold text-gray-600">{timeLeft}</span>.</p>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                <span className="font-mono font-bold text-gray-800 tracking-widest flex-1">{hh.invite_code}</span>
                <button onClick={() => copyCode(hh.invite_code!)} className="text-gray-400 hover:text-teal-600 transition-colors">
                  {codeCopied ? <Check size={14} className="text-teal-500" /> : <Copy size={14} />}
                </button>
              </div>
              <div className="flex gap-3">
                <button className="text-xs text-gray-400 hover:text-gray-600" onClick={handleRegenerate} disabled={hhBusy}>
                  Generate new code
                </button>
                <span className="text-gray-200">·</span>
                <button className="text-xs text-teal-600 hover:text-teal-700 font-semibold" disabled={hhBusy}
                  onClick={async () => {
                    setHhBusy(true); setHhErr('')
                    try { await householdApi.delete(); setHh({ role: 'none' }); setHhMode('join') }
                    catch (e: any) { setHhErr(e.message) }
                    setHhBusy(false)
                  }}>
                  Join House instead
                </button>
              </div>
            </div>
          )}

          {hh?.role === 'owner' && hh.partner_id && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs bg-teal-50 border border-teal-100 rounded-xl px-3 py-2">
                <Users size={13} className="text-teal-500" />
                <span className="text-teal-700 font-semibold">Household active · 2 members</span>
              </div>
              <button className="text-xs text-red-400 hover:text-red-600" onClick={handleRemovePartner} disabled={hhBusy}>
                Remove partner
              </button>
            </div>
          )}

          {hh?.role === 'partner' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs bg-teal-50 border border-teal-100 rounded-xl px-3 py-2">
                <Users size={13} className="text-teal-500" />
                <span className="text-teal-700 font-semibold">You're sharing a household</span>
              </div>
              <button className="text-xs text-red-400 hover:text-red-600" onClick={handleLeave} disabled={hhBusy}>
                Leave household
              </button>
            </div>
          )}
        </div>

        {/* Backup & Restore */}
        <div className="p-5 space-y-3">
          <p className="text-sm font-bold text-gray-700">Backup & Restore</p>
          <p className="text-xs text-gray-400">Export all your data as an Excel file, or import a previous backup.</p>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={handleExport}>Export</button>
            <button className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={importing}>
              {importing ? 'Importing…' : 'Import'}
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="p-5 space-y-3">
          <p className="text-sm font-bold text-gray-700">Danger Zone</p>
          <p className="text-xs text-gray-400">Permanently delete all your data. This cannot be undone.</p>
          {confirmClear ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600 font-medium">Are you sure?</span>
              <button className="btn-danger" onClick={handleClear}>Yes, delete all</button>
              <button className="btn-secondary" onClick={() => setConfirmClear(false)}>Cancel</button>
            </div>
          ) : (
            <button className="btn-secondary !text-red-500 !border-red-200 hover:!bg-red-50 flex items-center gap-2 w-fit" onClick={() => setConfirmClear(true)}>
              <Trash2 size={14} /> Delete all data
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
