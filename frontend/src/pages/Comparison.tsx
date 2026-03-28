import { useState, useEffect } from 'react'
import { listings as listingsApi } from '../lib/api'
import type { FetchedListing } from '../lib/api'
import { Plus, X, ExternalLink, ArrowUpDown, Loader2, Star, Home, Save, Trash2, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import Alert from '../components/Alert'

// ── Types ─────────────────────────────────────────────────────────────────────
interface CompItem {
  id: string
  url: string
  name: string
  price: number
  sqm: number
  rooms: number
  avgift: number
  image: string
  site: string
  notes: string
  rating: number   // 1–5
}

type SortKey = 'price' | 'sqm' | 'pricePerSqm' | 'monthly' | 'rating'

interface SavedComparison {
  id: string
  name: string
  date: string
  items: CompItem[]
}

// ── Mortgage calculation (same logic as Calculator page) ──────────────────────
function monthlyMortgage(price: number, avgift: number): number {
  const down    = price * 0.10
  const loan    = price - down
  const rate    = 0.035
  const interest = loan * rate / 12
  const taxRelief = Math.min(loan * rate, 100_000) * 0.30 / 12
  const ltv = loan / price * 100
  const amortRate = ltv > 70 ? 0.02 : ltv > 50 ? 0.01 : 0
  const amort = loan * amortRate / 12
  return Math.round(interest - taxRelief + amort + avgift + 3000) // 3000 drift
}

function fmt(n: number) { return Math.round(n).toLocaleString('sv-SE') }

// ── Star rating ───────────────────────────────────────────────────────────────
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i === value ? 0 : i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          className="transition-colors"
        >
          <Star
            size={14}
            className={`transition-colors ${(hover || value) >= i ? 'text-gold-400 fill-gold-400' : 'text-gray-200'}`}
          />
        </button>
      ))}
    </div>
  )
}

// ── Listing card ──────────────────────────────────────────────────────────────
function ListingCard({
  item, rank, onRemove, onUpdate, isBest,
}: {
  item: CompItem
  rank: number
  onRemove: () => void
  onUpdate: (id: string, key: keyof CompItem, val: any) => void
  isBest: boolean
}) {
  const monthly    = monthlyMortgage(item.price, item.avgift)
  const pricePerSqm = item.sqm > 0 ? Math.round(item.price / item.sqm) : 0

  return (
    <div className={`card flex flex-col gap-3 relative transition-all ${
      isBest ? 'ring-2 ring-teal-600 ring-offset-2' : ''
    }`}>
      {isBest && (
        <div className="absolute -top-3 left-4 text-[10px] font-black bg-teal-600 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          Best value
        </div>
      )}

      {/* Remove */}
      <button
        onClick={onRemove}
        className="absolute top-3 right-3 text-gray-200 hover:text-red-400 transition-colors"
      >
        <X size={14} />
      </button>

      {/* Name */}
      <div className="font-bold text-gray-900 text-sm leading-snug pr-4">{item.name}</div>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Price',      value: item.price  ? `${fmt(item.price)} kr`     : '—' },
          { label: 'Size',       value: item.sqm    ? `${item.sqm} m²`            : '—' },
          { label: 'Price/m²',  value: pricePerSqm ? `${fmt(pricePerSqm)} kr`    : '—' },
          { label: 'Rooms',      value: item.rooms  ? `${item.rooms} rum`         : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 rounded-xl px-3 py-2">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</div>
            <div className="text-sm font-black text-gray-900 mt-0.5 tabular-nums">{value}</div>
          </div>
        ))}
      </div>

      {/* Editable fields */}
      <div className="space-y-2">
        <div>
          <label className="label">Asking Price (SEK)</label>
          <input type="number" className="input" step={50000} min={0}
            value={item.price || ''}
            onChange={e => onUpdate(item.id, 'price', parseInt(e.target.value) || 0)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Size (m²)</label>
            <input type="number" className="input" step={1} min={0}
              value={item.sqm || ''}
              onChange={e => onUpdate(item.id, 'sqm', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Avgift (kr/mo)</label>
            <input type="number" className="input" step={100} min={0}
              value={item.avgift || ''}
              onChange={e => onUpdate(item.id, 'avgift', parseInt(e.target.value) || 0)} />
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input resize-none text-xs" rows={2}
            placeholder="Pros, cons, gut feeling…"
            value={item.notes}
            onChange={e => onUpdate(item.id, 'notes', e.target.value)} />
        </div>
      </div>

      {/* Monthly cost */}
      <div className="bg-teal-50 border border-teal-100 rounded-2xl px-4 py-3 mt-auto">
        <div className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">Est. monthly cost</div>
        <div className="text-xl font-black text-teal-700 tabular-nums mt-0.5">{fmt(monthly)} kr</div>
        <div className="text-[10px] text-teal-500 mt-0.5">10% down · 3.5% rate · excl. drift</div>
      </div>

      {/* Rating + link */}
      <div className="flex items-center justify-between">
        <StarRating value={item.rating} onChange={v => onUpdate(item.id, 'rating', v)} />
        {item.url && (
          <a href={item.url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700">
            View listing <ExternalLink size={11} />
          </a>
        )}
      </div>
    </div>
  )
}

// ── Add form ──────────────────────────────────────────────────────────────────
function AddForm({ onAdd }: { onAdd: (item: Omit<CompItem, 'id'>) => void }) {
  const [url,      setUrl]      = useState('')
  const [fetching, setFetching] = useState(false)
  const [fetched,  setFetched]  = useState<FetchedListing | null>(null)
  const [error,    setError]    = useState('')

  // Editable fields after fetch
  const [name,   setName]   = useState('')
  const [price,  setPrice]  = useState(0)
  const [sqm,    setSqm]    = useState(0)
  const [rooms,  setRooms]  = useState(0)
  const [avgift, setAvgift] = useState(0)

  async function handleFetch() {
    if (!url.trim()) return
    setError(''); setFetching(true); setFetched(null)
    try {
      const data = await listingsApi.fetch(url.trim())
      setFetched(data)
      setName(data.name || '')
      setPrice(data.price || 0)
      setSqm(data.sqm || 0)
      setRooms(data.rooms || 0)
    } catch (e: any) {
      setError('Could not fetch listing. You can still fill in the details manually.')
      setName(''); setPrice(0); setSqm(0); setRooms(0); setAvgift(0)
      setFetched({ name: '', price: null, sqm: null, rooms: null, image: '', site: '', description: '' })
    } finally {
      setFetching(false)
    }
  }

  function handleAdd() {
    if (!name.trim() && !url.trim()) { setError('Enter at least a name or URL.'); return }
    onAdd({
      url: url.trim(),
      name: name.trim() || url.trim(),
      price, sqm, rooms, avgift,
      image: fetched?.image || '',
      site:  fetched?.site  || '',
      notes: '',
      rating: 0,
    })
    setUrl(''); setFetched(null); setName(''); setPrice(0); setSqm(0); setRooms(0); setAvgift(0); setError('')
  }

  return (
    <div className="card border-teal-100 space-y-4">
      <div className="section-label">Add a listing</div>

      {/* URL input + fetch */}
      <div>
        <label className="label">Listing URL (Hemnet, Booli, etc.)</label>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="https://www.hemnet.se/bostad/..."
            value={url}
            onChange={e => { setUrl(e.target.value); setFetched(null) }}
            onKeyDown={e => e.key === 'Enter' && handleFetch()}
          />
          <button
            className="btn-primary shrink-0"
            onClick={handleFetch}
            disabled={fetching || !url.trim()}
          >
            {fetching ? <Loader2 size={14} className="animate-spin" /> : 'Fetch'}
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          We'll try to extract the price and details automatically. You can edit anything below.
        </p>
      </div>

      {error && <Alert kind="warning">{error}</Alert>}

      {/* Show form once fetched (or on error to allow manual entry) */}
      {fetched !== null && (
        <>
          {fetched.partial && (
            <Alert kind="info">
              Could not fetch full page details — the site may block automated requests.
              Please fill in <strong>price, size and avgift</strong> manually from the listing.
            </Alert>
          )}
          {fetched.image && (
            <img src={fetched.image} alt={name} className="w-full h-40 object-cover rounded-2xl" />
          )}
          {fetched.description && (
            <p className="text-xs text-gray-400 italic">"{fetched.description}"</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Name / Address</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Folkungagatan 45, Södermalm" />
            </div>
            <div>
              <label className="label">Asking Price (SEK)</label>
              <input type="number" className="input" step={50000} min={0}
                value={price || ''} onChange={e => setPrice(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="label">Avgift (kr/month)</label>
              <input type="number" className="input" step={100} min={0}
                value={avgift || ''} onChange={e => setAvgift(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="label">Size (m²)</label>
              <input type="number" className="input" step={1} min={0}
                value={sqm || ''} onChange={e => setSqm(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="label">Rooms</label>
              <input type="number" className="input" step={1} min={0}
                value={rooms || ''} onChange={e => setRooms(parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <button className="btn-primary" onClick={handleAdd}>
            <Plus size={14} /> Add to comparison
          </button>
        </>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
const STORAGE_KEY  = 'kj_comparison_items'
const SAVED_KEY    = 'kj_saved_comparisons'

export default function Comparison() {
  const [items, setItems] = useState<CompItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  })
  const [saved, setSaved] = useState<SavedComparison[]>(() => {
    try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]') } catch { return [] }
  })
  const [showAdd,      setShowAdd]      = useState(false)
  const [sortBy,       setSortBy]       = useState<SortKey>('price')
  const [saveName,     setSaveName]     = useState('')
  const [showSaveBox,  setShowSaveBox]  = useState(false)
  const [showHistory,  setShowHistory]  = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  useEffect(() => {
    localStorage.setItem(SAVED_KEY, JSON.stringify(saved))
  }, [saved])

  function saveComparison() {
    if (!saveName.trim()) return
    const snap: SavedComparison = {
      id: crypto.randomUUID().slice(0, 8),
      name: saveName.trim(),
      date: new Date().toLocaleDateString('sv-SE'),
      items: [...items],
    }
    setSaved(prev => [snap, ...prev])
    setItems([])
    setSaveName('')
    setShowSaveBox(false)
    setShowHistory(true)
  }

  function loadComparison(snap: SavedComparison) {
    setItems(snap.items)
    setShowHistory(false)
  }

  function deleteSnapshot(id: string) {
    setSaved(prev => prev.filter(s => s.id !== id))
  }

  function addItem(item: Omit<CompItem, 'id'>) {
    setItems(prev => [...prev, { ...item, id: crypto.randomUUID().slice(0, 8) }])
    setShowAdd(false)
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function updateItem(id: string, key: keyof CompItem, val: any) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [key]: val } : i))
  }

  // Sort
  const sorted = [...items].sort((a, b) => {
    if (sortBy === 'price')       return a.price - b.price
    if (sortBy === 'sqm')         return b.sqm - a.sqm
    if (sortBy === 'pricePerSqm') return (a.sqm ? a.price / a.sqm : Infinity) - (b.sqm ? b.price / b.sqm : Infinity)
    if (sortBy === 'monthly')     return monthlyMortgage(a.price, a.avgift) - monthlyMortgage(b.price, b.avgift)
    if (sortBy === 'rating')      return b.rating - a.rating
    return 0
  })

  // Best value = lowest price per sqm (with both values set)
  const bestId = sorted.find(i => i.price > 0 && i.sqm > 0)?.id

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'price',       label: 'Price' },
    { key: 'sqm',         label: 'Size' },
    { key: 'pricePerSqm', label: 'Price/m²' },
    { key: 'monthly',     label: 'Monthly cost' },
    { key: 'rating',      label: 'My rating' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Comparison</h1>
          <p className="text-sm text-gray-400 mt-0.5">Compare listings from any website side by side</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {items.length > 0 && !showSaveBox && (
            <>
              <button className="btn-secondary" onClick={() => { setShowSaveBox(true); setShowAdd(false) }}>
                <Save size={14} /> Save comparison
              </button>
              {!confirmClear ? (
                <button className="btn-danger" onClick={() => setConfirmClear(true)}>
                  <Trash2 size={14} /> Clear all
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600 font-medium">Clear current?</span>
                  <button className="btn-danger" onClick={() => { setItems([]); setConfirmClear(false) }}>Yes</button>
                  <button className="btn-secondary" onClick={() => setConfirmClear(false)}>No</button>
                </div>
              )}
            </>
          )}
          {!showSaveBox && (
            <button className="btn-primary" onClick={() => setShowAdd(s => !s)}>
              {showAdd ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add listing</>}
            </button>
          )}
        </div>
      </div>

      {/* Save box */}
      {showSaveBox && (
        <div className="card border-teal-100 space-y-3">
          <div className="section-label">Save this comparison</div>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="e.g. March shortlist, Round 2…"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveComparison()}
              autoFocus
            />
            <button className="btn-primary shrink-0" onClick={saveComparison} disabled={!saveName.trim()}>
              <Save size={14} /> Save
            </button>
            <button className="btn-secondary shrink-0" onClick={() => { setShowSaveBox(false); setSaveName('') }}>
              Cancel
            </button>
          </div>
          <p className="text-[11px] text-gray-400">Current listings will be saved and the board cleared.</p>
        </div>
      )}

      {showAdd && <AddForm onAdd={addItem} />}

      {items.length === 0 && !showAdd ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <Home size={36} className="text-gray-200 mb-3" />
          <p className="text-sm font-semibold text-gray-400">No listings yet</p>
          <p className="text-xs text-gray-300 mt-1">Paste a Hemnet, Booli or any listing URL to get started</p>
        </div>
      ) : items.length > 0 && (
        <>
          {/* Sort bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <ArrowUpDown size={11} /> Sort by
            </span>
            {SORT_OPTIONS.map(o => (
              <button
                key={o.key}
                onClick={() => setSortBy(o.key)}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                  sortBy === o.key
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                {o.label}
              </button>
            ))}
            <span className="ml-auto text-xs text-gray-400">{items.length} listing{items.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Cards grid */}
          <div className="grid gap-4" style={{
            gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, minmax(0, 1fr))`
          }}>
            {sorted.map((item, i) => (
              <ListingCard
                key={item.id}
                item={item}
                rank={i + 1}
                onRemove={() => removeItem(item.id)}
                onUpdate={updateItem}
                isBest={item.id === bestId && items.length > 1}
              />
            ))}
          </div>

          {/* Summary table for 3+ items */}
          {items.length >= 3 && (
            <div className="card overflow-x-auto">
              <div className="section-label mb-4">Quick Summary</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Listing', 'Price', 'Size', 'Price/m²', 'Avgift', 'Est. Monthly', 'Rating'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(item => {
                    const monthly = monthlyMortgage(item.price, item.avgift)
                    const ppm     = item.sqm > 0 ? Math.round(item.price / item.sqm) : 0
                    return (
                      <tr key={item.id} className={`border-b border-gray-50 ${item.id === bestId ? 'bg-teal-50/60' : ''}`}>
                        <td className="py-2.5 px-3 font-semibold text-gray-900 max-w-[160px] truncate">{item.name}</td>
                        <td className="py-2.5 px-3 tabular-nums">{item.price ? `${fmt(item.price)} kr` : '—'}</td>
                        <td className="py-2.5 px-3 tabular-nums">{item.sqm ? `${item.sqm} m²` : '—'}</td>
                        <td className="py-2.5 px-3 tabular-nums">{ppm ? `${fmt(ppm)} kr` : '—'}</td>
                        <td className="py-2.5 px-3 tabular-nums">{item.avgift ? `${fmt(item.avgift)} kr` : '—'}</td>
                        <td className="py-2.5 px-3 font-bold text-teal-700 tabular-nums">{fmt(monthly)} kr</td>
                        <td className="py-2.5 px-3">
                          {item.rating > 0 ? '⭐'.repeat(item.rating) : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Saved comparisons */}
      {saved.length > 0 && (
        <div className="card">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => setShowHistory(s => !s)}
          >
            <span className="section-label">Saved comparisons ({saved.length})</span>
            {showHistory ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </button>

          {showHistory && (
            <div className="mt-4 space-y-2">
              {saved.map(snap => (
                <div key={snap.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm truncate">{snap.name}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{snap.date} · {snap.items.length} listing{snap.items.length !== 1 ? 's' : ''}</div>
                  </div>
                  <button
                    onClick={() => loadComparison(snap)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                  >
                    <RotateCcw size={11} /> Load
                  </button>
                  <button
                    onClick={() => deleteSnapshot(snap.id)}
                    className="shrink-0 text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
