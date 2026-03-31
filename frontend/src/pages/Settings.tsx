import { useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { Trash2, Lock, LockOpen, Eye, EyeOff, X, KeyRound } from 'lucide-react'
import { dashboard, data as dataApi, viewings as viewingsApi, upcoming as upcomingApi, settings as settingsApi, targetAreas as targetAreasApi, blobs } from '../lib/api'
import Alert from '../components/Alert'
import {
  isEncryptionEnabled, enableEncryption, disableEncryption,
  setSessionPassphrase, getSessionPassphrase, clearSessionPassphrase,
  encryptData, decryptData, isEncryptedBlob,
} from '../lib/crypto'

const BLOB_KEYS = ['checklist', 'comparison_items', 'saved_comparisons', 'calc_snapshots', 'brf_checks']

export default function Settings() {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const [msgKind, setMsgKind] = useState<'success' | 'danger'>('success')
  const [importing, setImporting] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  // Encryption state
  const [encOn, setEncOn] = useState(isEncryptionEnabled)
  const [passphrase, setPassphrase] = useState('')
  const [encErr, setEncErr] = useState('')
  const [encBusy, setEncBusy] = useState(false)
  const [showEncForm, setShowEncForm] = useState(false)
  const [savedPassphrase, setSavedPassphrase] = useState('')
  const [showSaved, setShowSaved] = useState(false)
  const needsUnlock = encOn && !getSessionPassphrase()

  // Change passphrase state
  const [showChangeForm, setShowChangeForm] = useState(false)
  const [oldPassphrase, setOldPassphrase] = useState('')
  const [newPassphrase, setNewPassphrase] = useState('')
  const [changeErr, setChangeErr] = useState('')
  const [changeBusy, setChangeBusy] = useState(false)

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

  // ── Encryption ────────────────────────────────────────────────────────────
  async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
    for (let i = 0; i <= retries; i++) {
      try { return await fn() }
      catch (e) { if (i === retries) throw e }
    }
    throw new Error('unreachable')
  }

  async function handleEnable() {
    if (passphrase.length < 8) { setEncErr('Min 8 characters'); return }
    setEncBusy(true)
    try {
      for (const key of BLOB_KEYS) {
        const raw = await withRetry(() => blobs.get<any>(key))
        if (raw && !isEncryptedBlob(raw)) {
          const enc = await encryptData(raw, passphrase)
          await withRetry(() => blobs.set(key, enc as any))
        }
      }
      enableEncryption(); setSessionPassphrase(passphrase)
      setEncOn(true); setShowEncForm(false); setSavedPassphrase(passphrase); setShowSaved(false); setPassphrase('')
      qc.invalidateQueries(); notify('Encryption enabled.')
    } catch { setEncErr('Encryption failed — check your connection and try again') }
    setEncBusy(false)
  }

  async function handleDisable() {
    if (!passphrase) { setEncErr('Enter passphrase'); return }
    setEncBusy(true)
    try {
      for (const key of BLOB_KEYS) {
        const raw = await withRetry(() => blobs.get<any>(key))
        if (raw && isEncryptedBlob(raw)) {
          const dec = await decryptData(raw as string, passphrase)
          await withRetry(() => blobs.set(key, dec))
        }
      }
      disableEncryption(); clearSessionPassphrase()
      setEncOn(false); setShowEncForm(false); setPassphrase('')
      qc.invalidateQueries(); notify('Encryption disabled.')
    } catch { setEncErr('Wrong passphrase or connection error') }
    setEncBusy(false)
  }

  async function handleUnlock() {
    if (passphrase.length < 8) { setEncErr('Min 8 characters'); return }
    setSessionPassphrase(passphrase)
    setShowEncForm(false); setPassphrase('')
    qc.invalidateQueries(); notify('Data unlocked.')
  }

  async function handleChangePassphrase() {
    if (oldPassphrase.length < 8) { setChangeErr('Old passphrase too short'); return }
    if (newPassphrase.length < 8) { setChangeErr('New passphrase min 8 characters'); return }
    if (oldPassphrase === newPassphrase) { setChangeErr('New passphrase must be different'); return }
    setChangeBusy(true)
    try {
      // Verify old passphrase by attempting a decrypt, then re-encrypt with new one
      for (const key of BLOB_KEYS) {
        const raw = await withRetry(() => blobs.get<any>(key))
        if (raw && isEncryptedBlob(raw)) {
          const decrypted = await decryptData(raw as string, oldPassphrase)
          const reenc = await encryptData(decrypted, newPassphrase)
          await withRetry(() => blobs.set(key, reenc as any))
        }
      }
      setSessionPassphrase(newPassphrase)
      setShowChangeForm(false); setOldPassphrase(''); setNewPassphrase(''); setSavedPassphrase(newPassphrase); setShowSaved(false)
      qc.invalidateQueries(); notify('Passphrase updated.')
    } catch { setChangeErr('Old passphrase is incorrect') }
    setChangeBusy(false)
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

        {/* Encryption */}
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            {encOn ? <Lock size={15} className="text-teal-600" /> : <LockOpen size={15} className="text-gray-400" />}
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-700">Data Encryption</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {encOn
                  ? needsUnlock
                    ? 'Data is encrypted — enter passphrase to unlock this session.'
                    : 'AES-256 active. Only you can read your data.'
                  : 'Encrypt your data so it is unreadable in the database.'}
              </p>
            </div>
            {encOn && (
              <div className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${needsUnlock ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-teal-600 bg-teal-50 border-teal-100'}`}>
                <Lock size={9} />
                {needsUnlock ? 'Locked' : 'Active'}
              </div>
            )}
            <button
              onClick={() => { if (!encBusy) { setShowEncForm(true); setEncErr('') } }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${encOn ? 'bg-teal-600' : 'bg-gray-200'}`}
              role="switch"
              aria-checked={encOn}
              disabled={encBusy}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${encOn ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          {/* Show passphrase once after enabling */}
          {savedPassphrase && (
            <div className="relative space-y-2 p-3 bg-amber-50 rounded-2xl border border-amber-100">
              <button className="absolute top-2 right-2 text-amber-400 hover:text-amber-600" onClick={() => setSavedPassphrase('')}>
                <X size={14} />
              </button>
              <p className="text-xs font-semibold text-amber-700">Save your passphrase — it won't be shown again</p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <code className="block w-full text-xs font-mono bg-white border border-amber-200 rounded-lg px-3 py-2 pr-8 text-gray-800 select-all break-all">
                    {showSaved ? savedPassphrase : '•'.repeat(savedPassphrase.length)}
                  </code>
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowSaved(v => !v)}
                  >
                    {showSaved ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                <button className="btn-secondary !text-xs !py-1.5 shrink-0" onClick={() => navigator.clipboard.writeText(savedPassphrase)}>
                  Copy
                </button>
              </div>
            </div>
          )}

          {showEncForm && (
            <div className="space-y-2 p-3 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-xs font-medium text-gray-600">
                {encOn ? (needsUnlock ? 'Enter passphrase to unlock' : 'Enter passphrase to disable encryption') : 'Choose a passphrase to encrypt your data'}
              </p>
              <input
                autoFocus
                type="password"
                className="input"
                placeholder="Passphrase (min 8 characters)"
                value={passphrase}
                onChange={e => { setPassphrase(e.target.value); setEncErr('') }}
                onKeyDown={e => e.key === 'Enter' && (encOn ? (needsUnlock ? handleUnlock() : handleDisable()) : handleEnable())}
              />
              {encErr && <p className="text-xs text-red-400">{encErr}</p>}
              {!encOn && <p className="text-xs text-gray-400">Remember this — if forgotten, encrypted data cannot be recovered.</p>}
              <div className="flex gap-2">
                <button className="btn-primary" onClick={encOn ? (needsUnlock ? handleUnlock : handleDisable) : handleEnable} disabled={encBusy}>
                  {encBusy ? 'Working…' : encOn ? (needsUnlock ? 'Unlock' : 'Disable') : 'Enable'}
                </button>
                <button className="btn-secondary" onClick={() => { setShowEncForm(false); setPassphrase(''); setEncErr('') }}>Cancel</button>
              </div>
            </div>
          )}

          {/* Change passphrase — only when active and unlocked */}
          {encOn && !needsUnlock && !showEncForm && (
            <>
              {!showChangeForm ? (
                <button
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-teal-600 transition-colors"
                  onClick={() => { setShowChangeForm(true); setChangeErr('') }}
                >
                  <KeyRound size={12} /> Change passphrase
                </button>
              ) : (
                <div className="space-y-2 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-xs font-medium text-gray-600">Change passphrase</p>
                  <input
                    autoFocus
                    type="password"
                    className="input"
                    placeholder="Current passphrase"
                    value={oldPassphrase}
                    onChange={e => { setOldPassphrase(e.target.value); setChangeErr('') }}
                  />
                  <input
                    type="password"
                    className="input"
                    placeholder="New passphrase (min 8 characters)"
                    value={newPassphrase}
                    onChange={e => { setNewPassphrase(e.target.value); setChangeErr('') }}
                    onKeyDown={e => e.key === 'Enter' && handleChangePassphrase()}
                  />
                  {changeErr && <p className="text-xs text-red-400">{changeErr}</p>}
                  <div className="flex gap-2">
                    <button className="btn-primary" onClick={handleChangePassphrase} disabled={changeBusy}>
                      {changeBusy ? 'Updating…' : 'Update'}
                    </button>
                    <button className="btn-secondary" onClick={() => { setShowChangeForm(false); setOldPassphrase(''); setNewPassphrase(''); setChangeErr('') }}>Cancel</button>
                  </div>
                </div>
              )}
            </>
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
