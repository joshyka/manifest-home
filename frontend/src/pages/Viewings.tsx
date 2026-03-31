import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { viewings as viewingsApi } from '../lib/api'
import type { Viewing } from '../lib/api'
import Alert from '../components/Alert'
import { Plus, X, Archive, ChevronDown, ChevronUp, Pencil, Check, TrendingUp } from 'lucide-react'
import EmptyState from '../components/EmptyState'

// ── helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) { return Math.round(n).toLocaleString('sv-SE') }

function parseBids(notes: string): number[] {
  return notes.replace('[archived]', '').split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0)
}

function parsePrice(s: string): number | null {
  const n = parseInt(String(s).replace(/\s/g, ''))
  return isNaN(n) || n === 0 ? null : n
}

function isArchived(v: Viewing) { return v.notes?.includes('[archived]') }

// ── Bids tab ──────────────────────────────────────────────────────────────────
function BidsTab({ autoOpen }: { autoOpen: boolean }) {
  const qc = useQueryClient()

  // add form
  const [open, setOpen]               = useState(autoOpen)
  const [label, setLabel]             = useState('')
  const [url, setUrl]                 = useState('')
  const [date, setDate]               = useState(() => new Date().toISOString().split('T')[0])
  const [went, setWent]               = useState(false)
  const [bids, setBids]               = useState('')
  const [myBid, setMyBid]             = useState('')
  const [askingPrice, setAskingPrice] = useState('')
  const [err, setErr]                 = useState('')
  const [saved, setSaved]             = useState(false)

  // inline edit
  const [editId,           setEditId]           = useState<string | null>(null)
  const [editWent,         setEditWent]         = useState(false)
  const [editAddress,      setEditAddress]      = useState('')
  const [editDate,         setEditDate]         = useState('')
  const [editUrl,          setEditUrl]          = useState('')
  const [editBids,         setEditBids]         = useState('')
  const [editMyBid,        setEditMyBid]        = useState('')
  const [editAskingPrice,  setEditAskingPrice]  = useState('')
  const [editErr,          setEditErr]          = useState('')

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showArchived, setShowArchived]       = useState(false)
  const [trendSelected, setTrendSelected]     = useState<string | null>(null)
  const [mobileExpanded, setMobileExpanded]   = useState<string | null>(null)

  const { data: list = [], isLoading } = useQuery({ queryKey: ['viewings'], queryFn: viewingsApi.list })

  const addMutation = useMutation({
    mutationFn: viewingsApi.add,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['viewings'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setOpen(false); setLabel(''); setUrl('')
      setDate(new Date().toISOString().split('T')[0])
      setWent(false); setBids(''); setMyBid(''); setAskingPrice('')
      setSaved(true); setTimeout(() => setSaved(false), 3000)
    },
  })

  const archiveMutation = useMutation({
    mutationFn: viewingsApi.archive,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['viewings'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const unarchiveMutation = useMutation({
    mutationFn: viewingsApi.unarchive,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['viewings'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: viewingsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['viewings'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; outcome: string; num_bid_rounds: number; final_price: string; my_bid: string; notes: string; asking_price: string; date?: string; hemnet_url?: string; address?: string }) =>
      viewingsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['viewings'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setEditId(null); setEditErr('')
    },
    onError: (e: any) => setEditErr(e.message ?? 'Save failed'),
  })

  function openEdit(v: Viewing) {
    setEditId(v.id)
    setEditWent(v.outcome === 'Went to bidding')
    setEditAddress(v.address || '')
    setEditDate(v.date || '')
    setEditUrl(v.hemnet_url && v.hemnet_url !== 'nan' ? v.hemnet_url : '')
    setEditBids(v.notes.replace('[archived]', '').trim())
    setEditMyBid(v.my_bid && v.my_bid !== 'nan' ? v.my_bid : '')
    setEditAskingPrice(v.asking_price && v.asking_price !== 'nan' ? v.asking_price : '')
  }

  function submitEdit(v: Viewing) {
    const bidArr = editWent && editBids.trim()
      ? editBids.split(',').map(b => parseInt(b.trim().replace(/\s/g, ''))).filter(n => !isNaN(n))
      : []
    if (editMyBid.trim() && bidArr.length > 0) {
      const myBidNum = parseInt(editMyBid.trim().replace(/\s/g, ''))
      if (!bidArr.includes(myBidNum)) { setEditErr('My Bid must be one of the bid rounds.'); return }
    }
    const highest = bidArr.length > 0 ? String(Math.max(...bidArr)) : ''
    updateMutation.mutate({
      id: v.id,
      outcome: editWent ? 'Went to bidding' : 'Viewed — no bid',
      num_bid_rounds: bidArr.length,
      final_price: highest,
      my_bid: editMyBid.trim(),
      notes: bidArr.join(', '),
      asking_price: editAskingPrice.trim(),
      date: editDate || undefined,
      hemnet_url: editUrl || undefined,
      address: editAddress.trim() || undefined,
    })
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setErr('')
    if (!label.trim() && !url.trim()) { setErr('Please enter at least a label or a URL.'); return }
    const bidArr = went && bids.trim()
      ? bids.split(',').map(b => parseInt(b.trim().replace(/\s/g, ''))).filter(n => !isNaN(n))
      : []
    if (myBid.trim() && bidArr.length > 0) {
      const myBidNum = parseInt(myBid.trim().replace(/\s/g, ''))
      if (!bidArr.includes(myBidNum)) { setErr('My Bid must be one of the bid rounds.'); return }
    }
    const highest = bidArr.length > 0 ? String(Math.max(...bidArr)) : ''
    addMutation.mutate({
      address: label.trim() || url.trim(),
      date,
      hemnet_url: url.trim(),
      outcome: went ? 'Went to bidding' : 'Viewed — no bid',
      num_bid_rounds: bidArr.length,
      final_price: highest,
      my_bid: myBid.trim(),
      notes: bidArr.join(', '),
      asking_price: askingPrice.trim(),
    })
  }

  const active   = list.filter(v => !isArchived(v))
  const archived = list.filter(isArchived).reverse()

  const biddingRows = active
    .filter(v => v.outcome === 'Went to bidding')
    .map(v => ({
      ...v,
      rounds:   parseBids(v.notes || ''),
      highest:  parsePrice(v.final_price),
      myBidAmt: parsePrice(v.my_bid),
      askingAmt: parsePrice(v.asking_price),
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const viewedOnly = active
    .filter(v => v.outcome !== 'Went to bidding')
    .reverse()


  if (isLoading) return (
    <div className="space-y-3 animate-pulse">
      {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-11 h-11 rounded-xl bg-teal-600 hover:bg-teal-700 flex items-center justify-center shadow-sm transition-all active:scale-95"
        >
          {open ? <X size={18} className="text-white" /> : <Plus size={18} className="text-white" />}
        </button>
      </div>

      {saved && <Alert kind="success">Viewing saved.</Alert>}

      {/* Add form */}
      {open && (
        <div className="card border-teal-100">
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label !text-green-600">Address</label>
                <input className="input" placeholder="e.g. Folkungagatan 45 — 3 rooms" value={label}
                  onChange={e => setLabel(e.target.value)} />
              </div>
              <div>
                <label className="label !text-green-600">Listing URL</label>
                <input className="input" placeholder="https://www.hemnet.se/bostad/..." value={url}
                  onChange={e => setUrl(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label !text-green-600">Date</label>
                <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label className="label !text-green-600">Asking Price (SEK)</label>
                <input type="number" className="input" placeholder="e.g. 3200000" value={askingPrice}
                  onChange={e => setAskingPrice(e.target.value)} />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={went} onChange={e => setWent(e.target.checked)}
                    className="w-4 h-4 accent-teal-500 rounded" />
                  <span className="text-sm font-medium text-gray-700">Bidding</span>
                </label>
              </div>
            </div>
            {went && (
              <div className="space-y-3">
                <div>
                  <label className="label !text-green-600">All Bid Rounds (SEK, comma-separated)</label>
                  <input className="input" placeholder="e.g. 3200000, 3350000, 3500000" value={bids}
                    onChange={e => setBids(e.target.value)} />
                </div>
                <div>
                  <label className="label !text-green-600">My Bid (SEK) — optional</label>
                  <input type="number" className="input" placeholder="e.g. 3350000" value={myBid}
                    onChange={e => setMyBid(e.target.value)} />
                </div>
              </div>
            )}
            {err && <Alert kind="danger">{err}</Alert>}
            <button type="submit" disabled={addMutation.isPending} className="btn-primary">
              {addMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </form>
        </div>
      )}

      {/* Empty state */}
      {active.length === 0 && !open && (
        <EmptyState icon={TrendingUp} title="No viewings logged yet" message="Tap + to log your first viewing" />
      )}

      {/* ── Bidding auctions table ── */}
      {biddingRows.length > 0 && (
        <>
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-3 sm:px-5 text-[11px] font-bold text-green-600 uppercase tracking-wider">Address</th>
                  <th className="text-left py-3 px-3 sm:px-5 text-[11px] font-bold text-green-600 uppercase tracking-wider hidden sm:table-cell">Date</th>
                  <th className="text-left py-3 px-3 sm:px-5 text-[11px] font-bold text-green-600 uppercase tracking-wider hidden sm:table-cell">Asking</th>
                  <th className="text-left py-3 px-3 sm:px-5 text-[11px] font-bold text-green-600 uppercase tracking-wider hidden md:table-cell">Bid Rounds</th>
                  <th className="text-left py-3 px-3 sm:px-5 text-[11px] font-bold text-green-600 uppercase tracking-wider">Highest Bid</th>
                  <th className="text-left py-3 px-3 sm:px-5 text-[11px] font-bold text-green-600 uppercase tracking-wider hidden sm:table-cell">My Bid</th>
                  <th className="py-3 px-3 sm:px-5" />
                </tr>
              </thead>
              <tbody>
                {biddingRows.map(b => (
                  <>
                    <tr key={b.id} onClick={() => b.rounds.length > 0 && setTrendSelected(s => s === b.id ? null : b.id)}
                      className={`border-b border-gray-50 transition-colors ${b.rounds.length > 0 ? 'cursor-pointer hover:bg-teal-50/40' : ''} ${trendSelected === b.id ? 'bg-teal-50' : ''}`}>
                      <td className="py-3.5 px-3 sm:px-5 font-semibold text-gray-900 max-w-[120px] sm:max-w-none">
                        <div className="truncate">
                          {b.hemnet_url && b.hemnet_url !== 'nan'
                            ? <a href={b.hemnet_url} target="_blank" rel="noreferrer" className="hover:text-teal-700">{b.address}</a>
                            : b.address}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 sm:px-5 text-gray-500 whitespace-nowrap hidden sm:table-cell">{b.date}</td>
                      <td className="py-3.5 px-3 sm:px-5 tabular-nums text-gray-500 hidden sm:table-cell">
                        {b.askingAmt ? `${fmt(b.askingAmt)} kr` : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-3.5 px-3 sm:px-5 hidden md:table-cell">
                        {b.rounds.length > 0 ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {b.rounds.map((r, i) => (
                              <span key={i} className="flex items-center gap-1">
                                <span className={`text-xs tabular-nums px-2 py-0.5 rounded-lg font-semibold ${
                                  i === b.rounds.length - 1 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                                }`}>{fmt(r)}</span>
                                {i < b.rounds.length - 1 && <TrendingUp size={10} className="text-gray-300" />}
                              </span>
                            ))}
                          </div>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-3.5 px-3 sm:px-5 font-bold text-gray-900 tabular-nums">
                        {b.highest ? `${fmt(b.highest)} kr` : '—'}
                      </td>
                      <td className="py-3.5 px-3 sm:px-5 tabular-nums hidden sm:table-cell">
                        {b.myBidAmt ? <span className="font-bold text-teal-700">{fmt(b.myBidAmt)} kr</span> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-3.5 px-3 sm:px-5">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={e => { e.stopPropagation(); setMobileExpanded(s => s === b.id ? null : b.id) }}
                            className="sm:hidden text-gray-400 hover:text-teal-600 transition-colors"
                          >
                            {mobileExpanded === b.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          <button onClick={e => { e.stopPropagation(); editId === b.id ? setEditId(null) : openEdit(b) }}
                            className="text-gray-400 hover:text-teal-600 transition-colors" title="Edit">
                            <Pencil size={13} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); archiveMutation.mutate(b.id) }}
                            className="text-gray-300 hover:text-amber-400 transition-colors" title="Archive">
                            <Archive size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {mobileExpanded === b.id && (
                      <tr key={`${b.id}-mobile`} className="sm:hidden bg-gray-50 border-b border-gray-100">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="space-y-1.5 text-xs">
                            <div className="font-semibold text-gray-800">{b.address}</div>
                            {b.date && <div className="text-gray-400">{b.date}</div>}
                            {b.askingAmt && <div className="text-gray-500">Asking: <span className="font-semibold">{fmt(b.askingAmt)} kr</span></div>}
                            {b.myBidAmt && <div className="text-teal-700 font-semibold">My bid: {fmt(b.myBidAmt)} kr</div>}
                            {b.rounds.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                {b.rounds.map((r, i) => (
                                  <span key={i} className="flex items-center gap-1">
                                    <span className={`tabular-nums px-2 py-0.5 rounded-lg font-semibold ${
                                      i === b.rounds.length - 1 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                                    }`}>{fmt(r)}</span>
                                    {i < b.rounds.length - 1 && <TrendingUp size={9} className="text-gray-300" />}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    {editId === b.id && (
                      <tr key={`${b.id}-edit`} className="bg-gray-50">
                        <td colSpan={7} className="px-5 py-4">
                          <div className="space-y-3">
                            <div>
                              <label className="label !text-green-600">Address</label>
                              <input className="input" placeholder="e.g. Folkungagatan 45" value={editAddress} onChange={e => setEditAddress(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="label !text-green-600">Date</label>
                                <input type="date" className="input" value={editDate} onChange={e => setEditDate(e.target.value)} />
                              </div>
                              <div>
                                <label className="label !text-green-600">Asking Price (SEK)</label>
                                <input type="number" className="input" placeholder="e.g. 3200000"
                                  value={editAskingPrice} onChange={e => setEditAskingPrice(e.target.value)} />
                              </div>
                              <div>
                                <label className="label !text-green-600">Listing URL</label>
                                <input className="input" placeholder="https://www.hemnet.se/..." value={editUrl} onChange={e => setEditUrl(e.target.value)} />
                              </div>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input type="checkbox" checked={editWent} onChange={e => setEditWent(e.target.checked)}
                                className="w-4 h-4 accent-teal-500 rounded" />
                              <span className="text-sm font-medium text-gray-700">Bidding</span>
                            </label>
                            {editWent && (
                              <div className="space-y-3">
                                <div>
                                  <label className="label !text-green-600">All Bid Rounds (SEK, comma-separated)</label>
                                  <input className="input" placeholder="e.g. 3200000, 3350000, 3500000"
                                    value={editBids} onChange={e => setEditBids(e.target.value)} autoFocus />
                                                </div>
                                <div>
                                  <label className="label !text-green-600">My Bid (SEK) — optional</label>
                                  <input type="number" className="input" placeholder="e.g. 3350000"
                                    value={editMyBid} onChange={e => setEditMyBid(e.target.value)} />
                                </div>
                              </div>
                            )}
                            {editErr && <p className="text-xs text-red-500">{editErr}</p>}
                            <div className="flex gap-2">
                              <button className="btn-primary" onClick={() => submitEdit(b)} disabled={updateMutation.isPending}>
                                <Check size={13} /> {updateMutation.isPending ? 'Saving…' : 'Save'}
                              </button>
                              <button className="btn-secondary" onClick={() => { setEditId(null); setEditErr('') }}>Cancel</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {trendSelected === b.id && b.rounds.length > 0 && (() => {
                      const COLORS = ['#2E7D52', '#f59e0b', '#6366f1', '#ef4444', '#06b6d4', '#ec4899']
                      const colorIdx = biddingRows.findIndex(r => r.id === b.id)
                      const chartData = b.rounds.map((r, i) => ({ round: `R${i + 1}`, value: parseFloat((r / 1_000_000).toFixed(3)) }))
                      const minVal = Math.min(...b.rounds) / 1_000_000
                      const maxVal = Math.max(...b.rounds) / 1_000_000
                      const pad = (maxVal - minVal) * 0.15 || 0.1
                      const yDomain: [number, number] = [parseFloat((minVal - pad).toFixed(3)), parseFloat((maxVal + pad).toFixed(3))]
                      const xTicks = chartData.map(d => d.round)
                      const step = (yDomain[1] - yDomain[0]) / 4
                      const yTicks = Array.from({ length: 5 }, (_, i) => parseFloat((yDomain[0] + step * i).toFixed(3)))
                      return (
                        <tr key={`${b.id}-chart`} className="bg-teal-50/40">
                          <td colSpan={7} className="px-5 py-3">
                            <div className="w-52 mx-auto">
                              <ResponsiveContainer width="100%" aspect={1}>
                                <LineChart data={chartData} margin={{ top: 6, right: 6, left: 0, bottom: 4 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                  <XAxis dataKey="round" ticks={xTicks} tick={{ fontSize: 9, fill: '#9ca3af' }} height={16} interval={0} />
                                  <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} unit="M" domain={yDomain} ticks={yTicks} width={36} />
                                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid #e5e7eb' }}
                                    formatter={(v: any) => [Math.round(v * 1_000_000).toLocaleString('sv-SE') + ' kr']} />
                                  <Line dataKey="value" stroke={COLORS[colorIdx % COLORS.length]}
                                    strokeWidth={2} dot={{ r: 3 }} type="monotone" />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </td>
                        </tr>
                      )
                    })()}
                  </>
                ))}
              </tbody>
            </table>
          </div>

        </>
      )}

      {/* ── Viewed only (no bid) ── */}
      {viewedOnly.length > 0 && (
        <div className="card divide-y divide-gray-50">
          <div className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Viewed — no bid ({viewedOnly.length})
          </div>
          {viewedOnly.map(v => {
            const link = v.hemnet_url && v.hemnet_url !== 'nan' ? v.hemnet_url : ''
            const isEditing = editId === v.id
            return (
              <div key={v.id} className="py-4 first:pt-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 text-sm">{v.address}</div>
                    <div className="text-xs text-gray-400 mt-0.5">Added {v.date}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {link && (
                      <a href={link} target="_blank" rel="noreferrer"
                        className="text-xs font-semibold text-teal-700 hover:text-teal-800">View ↗</a>
                    )}
                    <button onClick={() => isEditing ? setEditId(null) : openEdit(v)}
                      className="text-xs text-gray-400 hover:text-teal-600 transition-colors" title="Edit">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => archiveMutation.mutate(v.id)}
                      className="text-gray-300 hover:text-amber-400 transition-colors" title="Archive">
                      <Archive size={13} />
                    </button>
                  </div>
                </div>
                {isEditing && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="label !text-green-600">Date</label>
                        <input type="date" className="input" value={editDate} onChange={e => setEditDate(e.target.value)} />
                      </div>
                      <div>
                        <label className="label !text-green-600">Asking Price (SEK)</label>
                        <input type="number" className="input" placeholder="e.g. 3200000"
                          value={editAskingPrice} onChange={e => setEditAskingPrice(e.target.value)} />
                      </div>
                      <div>
                        <label className="label !text-green-600">Listing URL</label>
                        <input className="input" placeholder="https://www.hemnet.se/..." value={editUrl} onChange={e => setEditUrl(e.target.value)} />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={editWent} onChange={e => setEditWent(e.target.checked)}
                        className="w-4 h-4 accent-teal-500 rounded" />
                      <span className="text-sm font-medium text-gray-700">Bidding</span>
                    </label>
                    {editWent && (
                      <div className="space-y-3">
                        <div>
                          <label className="label !text-green-600">All Bid Rounds (SEK, comma-separated)</label>
                          <input className="input" placeholder="e.g. 3200000, 3350000, 3500000"
                            value={editBids} onChange={e => setEditBids(e.target.value)} autoFocus />
                                </div>
                        <div>
                          <label className="label !text-green-600">My Bid (SEK) — optional</label>
                          <input type="number" className="input" placeholder="e.g. 3350000"
                            value={editMyBid} onChange={e => setEditMyBid(e.target.value)} />
                        </div>
                      </div>
                    )}
                    {editErr && <p className="text-xs text-red-500">{editErr}</p>}
                    <div className="flex gap-2">
                      <button className="btn-primary" onClick={() => submitEdit(v)} disabled={updateMutation.isPending}>
                        <Check size={13} /> {updateMutation.isPending ? 'Saving…' : 'Save'}
                      </button>
                      <button className="btn-secondary" onClick={() => { setEditId(null); setEditErr('') }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Archived ── */}
      {archived.length > 0 && (
        <div className="card">
          <button onClick={() => setShowArchived(s => !s)}
            className="w-full flex items-center justify-between text-sm font-semibold text-gray-500 hover:text-gray-700">
            <span>Archived ({archived.length})</span>
            {showArchived ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          {showArchived && (
            <div className="mt-4 space-y-3">
              {archived.map(v => {
                const highest = v.final_price && v.final_price !== 'nan' && v.final_price !== '0' && v.final_price !== ''
                  ? parseInt(v.final_price).toLocaleString('sv-SE') : null
                return (
                  <div key={v.id} className="bg-amber-50/60 border border-amber-100 rounded-xl px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-800 text-sm">{v.address}</span>
                          {highest && (
                            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                              Highest: {highest} kr
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => unarchiveMutation.mutate(v.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-all"
                          title="Make active">
                          <Archive size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirmDeleteId === v.id) { deleteMutation.mutate(v.id); setConfirmDeleteId(null) }
                            else { setConfirmDeleteId(v.id); setTimeout(() => setConfirmDeleteId(null), 2000) }
                          }}
                          className={`p-1.5 rounded-lg transition-all ${confirmDeleteId === v.id ? 'text-red-500 bg-red-50' : 'text-gray-300 hover:text-red-400 hover:bg-red-50'}`}
                          title={confirmDeleteId === v.id ? 'Click again to delete' : 'Delete'}>
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Viewings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [autoOpen, setAutoOpen] = useState(false)

  useEffect(() => {
    if (searchParams.get('add') === '1') {
      setAutoOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Viewings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Log viewings and track bidding history</p>
      </div>
      <BidsTab autoOpen={autoOpen} />
    </div>
  )
}
