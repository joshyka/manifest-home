import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { viewings as viewingsApi } from '../lib/api'
import type { Viewing } from '../lib/api'
import Alert from '../components/Alert'
import { Plus, X, Archive, ChevronDown, ChevronUp, Pencil, Check, TrendingUp, Info } from 'lucide-react'

// ── Listings tab ─────────────────────────────────────────────────────────────
function ListingsTab({ autoOpen }: { autoOpen: boolean }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(autoOpen)
  const [showArchived, setShowArchived] = useState(false)
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [went, setWent]       = useState(false)
  const [bids, setBids]       = useState('')
  const [myBid, setMyBid]     = useState('')
  const [saved, setSaved]     = useState(false)
  const [err, setErr]         = useState('')

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Inline edit state
  const [editId,    setEditId]    = useState<string | null>(null)
  const [editWent,  setEditWent]  = useState(false)
  const [editBids,  setEditBids]  = useState('')
  const [editMyBid, setEditMyBid] = useState('')
  const [editErr,   setEditErr]   = useState('')

  const { data: list = [] } = useQuery({ queryKey: ['viewings'], queryFn: viewingsApi.list })

  const addMutation = useMutation({
    mutationFn: viewingsApi.add,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['viewings'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setOpen(false); setLabel(''); setUrl(''); setDate(new Date().toISOString().split('T')[0])
      setWent(false); setBids(''); setMyBid(''); setSaved(true); setTimeout(() => setSaved(false), 3000)
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
    mutationFn: ({ id, ...data }: { id: string; outcome: string; num_bid_rounds: number; final_price: string; my_bid: string; notes: string }) =>
      viewingsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['viewings'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setEditId(null)
      setEditErr('')
    },
    onError: (e: any) => setEditErr(e.message ?? 'Save failed'),
  })

  function openEdit(v: Viewing) {
    setEditId(v.id)
    setEditWent(v.outcome === 'Went to bidding')
    const notesClean = v.notes.replace('[archived]', '').trim()
    setEditBids(notesClean)
    setEditMyBid(v.my_bid && v.my_bid !== 'nan' ? v.my_bid : '')
  }

  function submitEdit(v: Viewing) {
    const bidArr = editWent && editBids.trim()
      ? editBids.split(',').map(b => parseInt(b.trim().replace(/\s/g, ''))).filter(n => !isNaN(n))
      : []
    if (editMyBid.trim() && bidArr.length > 0) {
      const myBidNum = parseInt(editMyBid.trim().replace(/\s/g, ''))
      if (!bidArr.includes(myBidNum)) {
        setEditErr('My Bid must be one of the bid rounds entered above.')
        return
      }
    }
    const highest = bidArr.length > 0 ? String(Math.max(...bidArr)) : ''
    updateMutation.mutate({
      id: v.id,
      outcome: editWent ? 'Went to bidding' : 'Viewed — no bid',
      num_bid_rounds: bidArr.length,
      final_price: highest,
      my_bid: editMyBid.trim(),
      notes: bidArr.join(', '),
    })
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    if (!label.trim() && !url.trim()) {
      setErr('Please enter at least a label or a URL.')
      return
    }
    const bidArr = went && bids.trim()
      ? bids.split(',').map(b => parseInt(b.trim().replace(/\s/g, ''))).filter(n => !isNaN(n))
      : []
    if (myBid.trim() && bidArr.length > 0) {
      const myBidNum = parseInt(myBid.trim().replace(/\s/g, ''))
      if (!bidArr.includes(myBidNum)) {
        setErr('My Bid must be one of the bid rounds entered above.')
        return
      }
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
    })
  }

  const isArchived = (v: Viewing) => v.notes?.includes('[archived]')
  const active = list.filter(v => !isArchived(v)).reverse()
  const archived = list.filter(isArchived).reverse()

  function formatBids(v: Viewing) {
    const notesClean = v.notes.replace('[archived]', '').trim()
    const rounds = notesClean.split(',').map(r => r.trim()).filter(Boolean)
    if (rounds.length === 0) return null
    return rounds
      .filter(r => /^\d+(\.\d+)?$/.test(r))
      .map(r => `${parseInt(r).toLocaleString('sv-SE')}`)
      .join(' → ')
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="section-label !mb-0">Listings</h3>
        <button
          className={`p-1.5 rounded-xl transition-all ${open ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-50' : 'text-gray-400 hover:text-teal-600 hover:bg-teal-50'}`}
          onClick={() => setOpen(o => !o)}
          title={open ? 'Cancel' : 'Add listing'}
        >
          {open ? <X size={15} /> : <Plus size={15} />}
        </button>
      </div>

      {saved && <Alert kind="success">Listing saved.</Alert>}

      {/* Add form */}
      {open && (
        <div className="card border-teal-100">
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label !text-green-600">Date Added</label>
                <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
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
                  <p className="text-xs text-gray-400 mt-1">All bids in the auction, highest last</p>
                </div>
                <div>
                  <label className="label !text-green-600">My Bid (SEK) — optional</label>
                  <input type="number" className="input" placeholder="e.g. 3350000" value={myBid}
                    onChange={e => setMyBid(e.target.value)} />
                  <p className="text-xs text-gray-400 mt-1">The amount you personally bid</p>
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

      {/* Active listings */}
      {active.length === 0 ? null : (
        <div className="card divide-y divide-gray-50">
          <div className="pb-3 text-xs font-semibold text-green-600 uppercase tracking-wider">
            {active.length} active listing{active.length !== 1 ? 's' : ''}
          </div>
          {active.map(v => {
            const link = v.hemnet_url && v.hemnet_url !== 'nan' ? v.hemnet_url : ''
            const bidsFormatted = formatBids(v)
            const highest = v.final_price && v.final_price !== 'nan' && v.final_price !== '0' && v.final_price !== ''
              ? parseInt(v.final_price).toLocaleString('sv-SE')
              : null
            const myBidDisplay = v.my_bid && v.my_bid !== 'nan' && v.my_bid !== '0' && v.my_bid !== ''
              ? parseInt(v.my_bid).toLocaleString('sv-SE')
              : null
            const isEditing = editId === v.id
            return (
              <div key={v.id} className="py-4 first:pt-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 text-sm">{v.address}</div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-gray-400">Added {v.date}</span>
                      {v.outcome === 'Went to bidding' && (
                        <span className="text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full">
                          {highest ? `Highest: ${highest} kr` : 'Went to bidding'}
                        </span>
                      )}
                    </div>
                    {bidsFormatted && v.outcome === 'Went to bidding' && (
                      <div className="text-xs text-amber-700 mt-1">Rounds: {bidsFormatted} kr</div>
                    )}
                    {myBidDisplay && v.outcome === 'Went to bidding' && (
                      <div className="text-xs font-semibold text-teal-700 mt-0.5">My bid: {myBidDisplay} kr</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {link && (
                      <a href={link} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800">
                        View ↗
                      </a>
                    )}
                    <button
                      onClick={() => isEditing ? setEditId(null) : openEdit(v)}
                      className="text-xs text-gray-400 hover:text-teal-600 transition-colors"
                      title="Edit bidding info"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => archiveMutation.mutate(v.id)}
                      className="text-gray-300 hover:text-amber-400 transition-colors"
                      title="Archive listing"
                    >
                      <Archive size={13} />
                    </button>
                  </div>
                </div>

                {/* Inline edit panel */}
                {isEditing && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={editWent} onChange={e => setEditWent(e.target.checked)}
                        className="w-4 h-4 accent-teal-500 rounded" />
                      <span className="text-sm font-medium text-gray-700">Bidding</span>
                    </label>
                    {editWent && (
                      <div className="space-y-3">
                        <div>
                          <label className="label !text-green-600">All Bid Rounds (SEK, comma-separated)</label>
                          <input
                            className="input"
                            placeholder="e.g. 3200000, 3350000, 3500000"
                            value={editBids}
                            onChange={e => setEditBids(e.target.value)}
                            autoFocus
                          />
                          <p className="text-xs text-gray-400 mt-1">All bids in the auction, highest last</p>
                        </div>
                        <div>
                          <label className="label !text-green-600">My Bid (SEK) — optional</label>
                          <input
                            type="number"
                            className="input"
                            placeholder="e.g. 3350000"
                            value={editMyBid}
                            onChange={e => setEditMyBid(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                    {editErr && <p className="text-xs text-red-500">{editErr}</p>}
                    <div className="flex gap-2">
                      <button
                        className="btn-primary"
                        onClick={() => submitEdit(v)}
                        disabled={updateMutation.isPending}
                      >
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

      {/* Archived */}
      {archived.length > 0 && (
        <div className="card">
          <button
            onClick={() => setShowArchived(s => !s)}
            className="w-full flex items-center justify-between text-sm font-semibold text-gray-500 hover:text-gray-700"
          >
            <span>Bid history — archived ({archived.length})</span>
            {showArchived ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          {showArchived && (
            <div className="mt-4 space-y-3">
              {archived.map(v => {
                const bidsFormatted = formatBids(v)
                const highest = v.final_price && v.final_price !== 'nan' && v.final_price !== '0' && v.final_price !== ''
                  ? parseInt(v.final_price).toLocaleString('sv-SE')
                  : null
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
                        {bidsFormatted && v.outcome === 'Went to bidding' && (
                          <div className="text-xs text-amber-700 mt-1">Rounds: {bidsFormatted} kr</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => unarchiveMutation.mutate(v.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-all"
                          title="Make active"
                        >
                          <Archive size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirmDeleteId === v.id) {
                              deleteMutation.mutate(v.id)
                              setConfirmDeleteId(null)
                            } else {
                              setConfirmDeleteId(v.id)
                              setTimeout(() => setConfirmDeleteId(null), 2000)
                            }
                          }}
                          className={`p-1.5 rounded-lg transition-all ${confirmDeleteId === v.id ? 'text-red-500 bg-red-50' : 'text-gray-300 hover:text-red-400 hover:bg-red-50'}`}
                          title={confirmDeleteId === v.id ? 'Click again to delete' : 'Delete'}
                        >
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

// ── Bids tab ──────────────────────────────────────────────────────────────────
function fmt(n: number) { return Math.round(n).toLocaleString('sv-SE') }

function parseBids(notes: string): number[] {
  return notes.replace('[archived]', '').split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0)
}

function parsePrice(s: string): number | null {
  const n = parseInt(String(s).replace(/\s/g, ''))
  return isNaN(n) || n === 0 ? null : n
}

function BidsTab() {
  const { data: list = [] } = useQuery({ queryKey: ['viewings'], queryFn: viewingsApi.list })

  const bids = list
    .filter(v => v.outcome === 'Went to bidding')
    .map(v => ({
      ...v,
      rounds:   parseBids(v.notes || ''),
      highest:  parsePrice(v.final_price),
      myBidAmt: parsePrice(v.my_bid),
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const mostRounds = bids.length ? Math.max(...bids.map(b => b.rounds.length)) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-100 rounded-xl">
        <Info size={13} className="text-teal-500 shrink-0" />
        <p className="text-xs text-teal-700">Mark a listing as "Bidding" in the Listings tab to track it here.</p>
      </div>
      {bids.length > 0 && <>
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-green-600 uppercase tracking-widest">Bids Placed</span>
        <div className="text-3xl font-black text-teal-600">{bids.length}</div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['Address', 'Date', 'Bid Rounds', 'Highest Bid', 'My Bid'].map(h => (
                <th key={h} className="text-left py-3 px-5 text-[11px] font-bold text-green-600 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bids.map(b => (
              <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-3.5 px-5 font-semibold text-gray-900">{b.address}</td>
                <td className="py-3.5 px-5 text-gray-500 whitespace-nowrap">{b.date}</td>
                <td className="py-3.5 px-5">
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
                <td className="py-3.5 px-5 font-bold text-gray-900 tabular-nums">
                  {b.highest ? `${fmt(b.highest)} kr` : '—'}
                </td>
                <td className="py-3.5 px-5 tabular-nums">
                  {b.myBidAmt ? <span className="font-bold text-teal-700">{fmt(b.myBidAmt)} kr</span> : <span className="text-gray-300">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-5 py-3 border-t border-gray-50 text-xs text-gray-400">
          Bid rounds shown oldest → newest. My Bid is your personal bid amount.
        </div>
      </div>

      {mostRounds > 1 && (() => {
        const longest = bids.find(b => b.rounds.length === mostRounds)!
        return (
          <div className="card bg-amber-50 border-amber-100">
            <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">Longest auction</div>
            <div className="text-sm text-amber-900">
              <span className="font-bold">{longest.address}</span>
              {' · '}{mostRounds} rounds
              {longest.highest ? ` · ${fmt(longest.highest)} kr final` : ''}
              {longest.myBidAmt ? ` · my bid ${fmt(longest.myBidAmt)} kr` : ''}
            </div>
          </div>
        )
      })()}
      </>}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Viewings() {
  const [tab, setTab] = useState<'listings' | 'bids'>('listings')
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Viewings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Log viewings and track bidding history</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['listings', 'bids'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'listings' ? 'Listings' : 'Bids'}
          </button>
        ))}
      </div>

      {tab === 'listings' ? <ListingsTab autoOpen={autoOpen} /> : <BidsTab />}
    </div>
  )
}
