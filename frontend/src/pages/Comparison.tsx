import { useState, useEffect } from 'react'
import { useBlob } from '../lib/useBlob'
import { useRiksbankRate } from '../lib/useRiksbankRate'
import { X, ArrowUpDown, Star, Save, Trash2, ChevronDown, ChevronUp, RotateCcw, Check } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface CompItem {
  id: string
  name: string
  price: number
  sqm: number
  rooms: number
  avgift: number
  notes: string
  rating: number   // 1–5
}

type SortKey = 'price' | 'sqm' | 'monthly' | 'rating'

interface SavedComparison {
  id: string
  name: string
  date: string
  items: CompItem[]
}

// ── Mortgage calculation (same logic as Calculator page) ──────────────────────
function monthlyMortgage(price: number, avgift: number, ratePct: number): number {
  const down    = price * 0.10
  const loan    = price - down
  const rate    = ratePct / 100
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
  item, onRemove, onUpdate, isBest, rate,
}: {
  item: CompItem
  onRemove: () => void
  onUpdate: (id: string, key: keyof CompItem, val: any) => void
  isBest: boolean
  rate: number
}) {
  const monthly    = monthlyMortgage(item.price, item.avgift, rate)
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
        className="absolute top-3 right-3 p-1 rounded-lg text-gray-200 hover:text-red-400 hover:bg-red-50 transition-all"
        title="Remove"
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
            <div className="text-[10px] font-bold text-green-600 uppercase tracking-wider">{label}</div>
            <div className="text-sm font-black text-gray-900 mt-0.5 tabular-nums">{value}</div>
          </div>
        ))}
      </div>

      {/* Editable fields */}
      <div className="space-y-2">
        <div>
          <label className="label !text-green-600">Asking Price (SEK)</label>
          <input type="number" className="input" step={50000} min={0}
            value={item.price || ''}
            onChange={e => onUpdate(item.id, 'price', parseInt(e.target.value) || 0)} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="label !text-green-600">Size (m²)</label>
            <input type="number" className="input" step={1} min={0}
              value={item.sqm || ''}
              onChange={e => onUpdate(item.id, 'sqm', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label !text-green-600">Rooms</label>
            <input type="number" className="input" step={1} min={0}
              value={item.rooms || ''}
              onChange={e => onUpdate(item.id, 'rooms', parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label !text-green-600">Avgift (kr/mo)</label>
            <input type="number" className="input" step={100} min={0}
              value={item.avgift || ''}
              onChange={e => onUpdate(item.id, 'avgift', parseInt(e.target.value) || 0)} />
          </div>
        </div>
        <div>
          <label className="label !text-green-600">Notes</label>
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
        <div className="text-[10px] text-teal-500 mt-0.5">10% down · {rate}% rate · excl. others</div>
      </div>

      {/* Rating + link */}
      <div className="flex items-center justify-between">
        <StarRating value={item.rating} onChange={v => onUpdate(item.id, 'rating', v)} />
      </div>
    </div>
  )
}

// ── Add form ──────────────────────────────────────────────────────────────────
function AddForm({ onAdd }: { onAdd: (item: Omit<CompItem, 'id'>) => void }) {
  const [name,    setName]    = useState('')
  const [price,   setPrice]   = useState(0)
  const [sqm,     setSqm]     = useState(0)
  const [rooms,   setRooms]   = useState(0)
  const [avgift,  setAvgift]  = useState(0)
  const [touched, setTouched] = useState(false)
  const [added,   setAdded]   = useState(false)

  function handleAdd() {
    if (!name.trim()) { setTouched(true); return }
    onAdd({ name: name.trim(), price, sqm, rooms, avgift, notes: '', rating: 0 })
    setName(''); setPrice(0); setSqm(0); setRooms(0); setAvgift(0); setTouched(false)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="card border-teal-100 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label !text-green-600">Name / Address <span className="text-red-400">*</span></label>
          <input
            className={`input ${touched && !name.trim() ? 'border-red-300 focus:border-red-400' : ''}`}
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="e.g. Folkungagatan 45, Södermalm"
            autoFocus
          />
          {touched && !name.trim() && (
            <p className="text-xs text-red-400 mt-1">Name is required</p>
          )}
        </div>
        <div>
          <label className="label !text-green-600">Asking Price (SEK)</label>
          <input type="number" className="input" step={50000} min={0}
            value={price || ''} onChange={e => setPrice(parseInt(e.target.value) || 0)} />
        </div>
        <div>
          <label className="label !text-green-600">Avgift (kr/month)</label>
          <input type="number" className="input" step={100} min={0}
            value={avgift || ''} onChange={e => setAvgift(parseInt(e.target.value) || 0)} />
        </div>
        <div>
          <label className="label !text-green-600">Size (m²)</label>
          <input type="number" className="input" step={1} min={0}
            value={sqm || ''} onChange={e => setSqm(parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <label className="label !text-green-600">Rooms</label>
          <input type="number" className="input" step={1} min={0}
            value={rooms || ''} onChange={e => setRooms(parseInt(e.target.value) || 0)} />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          className={`btn-primary transition-all ${added ? '!bg-teal-50 !text-teal-600 !border !border-teal-200 !shadow-none' : ''}`}
          onClick={handleAdd}
        >
          {added ? <><Check size={13} /> Added</> : 'Compare'}
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Comparison() {
  const [items, saveItems] = useBlob<CompItem[]>('comparison_items', [])
  const [saved, saveSaved] = useBlob<SavedComparison[]>('saved_comparisons', [])
  const [sortBy,       setSortBy]       = useState<SortKey>('price')
  const [rate,         setRate]         = useState(3.5)
  const [rateInput,    setRateInput]    = useState('3.5')
  const { data: liveRate } = useRiksbankRate()

  useEffect(() => {
    if (liveRate) { setRate(liveRate); setRateInput(String(liveRate)) }
  }, [liveRate])
  const [saveName,     setSaveName]     = useState('')
  const [showSaveBox,  setShowSaveBox]  = useState(false)
  const [showHistory,  setShowHistory]  = useState(false)
  const [confirmClear,    setConfirmClear]    = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmLoadId,   setConfirmLoadId]   = useState<string | null>(null)

  function saveComparison() {
    if (!saveName.trim()) return
    const snap: SavedComparison = {
      id: crypto.randomUUID().slice(0, 8),
      name: saveName.trim(),
      date: new Date().toLocaleDateString('sv-SE'),
      items: [...items],
    }
    saveSaved([snap, ...saved])
    saveItems([])
    setSaveName('')
    setShowSaveBox(false)
    setShowHistory(true)
  }

  function loadComparison(snap: SavedComparison) {
    saveItems(snap.items)
    setShowHistory(false)
  }

  function deleteSnapshot(id: string) {
    saveSaved(saved.filter(s => s.id !== id))
  }

  function addItem(item: Omit<CompItem, 'id'>) {
    if (items.length >= 4) return
    saveItems([...items, { ...item, id: crypto.randomUUID().slice(0, 8) }])
  }

  function removeItem(id: string) {
    saveItems(items.filter(i => i.id !== id))
  }

  function updateItem(id: string, key: keyof CompItem, val: any) {
    saveItems(items.map(i => i.id === id ? { ...i, [key]: val } : i))
  }

  // Sort
  const sorted = [...items].sort((a, b) => {
    if (sortBy === 'price')       return a.price - b.price
    if (sortBy === 'sqm')         return b.sqm - a.sqm
    if (sortBy === 'monthly')     return monthlyMortgage(a.price, a.avgift, rate) - monthlyMortgage(b.price, b.avgift, rate)
    if (sortBy === 'rating')      return b.rating - a.rating
    return 0
  })

  // Best value = lowest price per sqm (independent of current sort order)
  const eligible = items.filter(i => i.price > 0 && i.sqm > 0)
  const bestId = eligible.length > 1
    ? eligible.reduce((a, b) => a.price / a.sqm < b.price / b.sqm ? a : b).id
    : undefined

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'price',       label: 'Price' },
    { key: 'sqm',         label: 'Size' },
    { key: 'monthly',     label: 'Monthly' },
    { key: 'rating',      label: 'My rating' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Comparison</h1>
            <p className="text-sm text-gray-400 mt-0.5">Compare up to 4 listings side by side</p>
          </div>
          {items.length > 0 && (
            <div className="flex items-center gap-1.5">
              {/* Save — icon opens inline input */}
              <div className="relative flex items-center">
                {showSaveBox ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      className="input !py-1.5 !text-xs w-44"
                      placeholder="Name this comparison…"
                      value={saveName}
                      onChange={e => setSaveName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveComparison()
                        if (e.key === 'Escape') { setShowSaveBox(false); setSaveName('') }
                      }}
                      autoFocus
                    />
                    <button
                      className="btn-primary !px-3 !py-1.5"
                      onClick={saveComparison}
                      disabled={!saveName.trim()}
                      title="Save"
                    >
                      <Save size={13} />
                    </button>
                    <button
                      className="btn-secondary !px-3 !py-1.5"
                      onClick={() => { setShowSaveBox(false); setSaveName('') }}
                      title="Cancel"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <button
                    className="p-2 rounded-xl text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-all"
                    onClick={() => setShowSaveBox(true)}
                    title="Save comparison"
                  >
                    <Save size={16} />
                  </button>
                )}
              </div>

              {/* Clear — icon turns red on second click */}
              <button
                className={`p-2 rounded-xl transition-all ${confirmClear ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-red-400 hover:bg-red-50'}`}
                onClick={() => {
                  if (confirmClear) { saveItems([]); setConfirmClear(false) }
                  else { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 2000) }
                }}
                title={confirmClear ? 'Click again to clear' : 'Clear all listings'}
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {items.length < 4 && <AddForm onAdd={addItem} />}

{items.length > 0 && (
        <>
          {/* Sort bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-green-600 uppercase tracking-wider flex items-center gap-1">
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
            <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
              {liveRate && (
                <span className="text-[10px] font-bold text-teal-600 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">
                  Live: {liveRate}%
                </span>
              )}
              <span>Interest</span>
              <input
                type="text"
                inputMode="decimal"
                className="w-12 text-center border border-gray-200 rounded-lg px-1.5 py-0.5 tabular-nums text-gray-700 [appearance:textfield]"
                value={rateInput}
                onChange={e => { setRateInput(e.target.value); const v = parseFloat(e.target.value); if (!isNaN(v)) setRate(v) }}
                onBlur={() => setRateInput(String(rate))}
              />
              <span>%</span>
            </div>
          </div>

          {/* Cards grid */}
          <div className={`grid gap-4 grid-cols-1 ${items.length >= 2 ? 'sm:grid-cols-2' : ''} ${items.length >= 3 ? 'lg:grid-cols-3' : ''} ${items.length >= 4 ? 'xl:grid-cols-4' : ''}`}>
            {sorted.map((item) => (
              <ListingCard
                key={item.id}
                item={item}

                onRemove={() => removeItem(item.id)}
                onUpdate={updateItem}
                isBest={item.id === bestId && items.length > 1}
                rate={rate}
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
                    const monthly = monthlyMortgage(item.price, item.avgift, rate)
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
                  {confirmLoadId === snap.id ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[11px] text-teal-600 font-medium">Replace active?</span>
                      <button onClick={() => { loadComparison(snap); setConfirmLoadId(null) }}
                        className="text-[11px] font-bold text-teal-600 hover:text-teal-700">Yes</button>
                      <button onClick={() => setConfirmLoadId(null)}
                        className="text-[11px] font-bold text-gray-400 hover:text-gray-600">No</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => items.length > 0 ? setConfirmLoadId(snap.id) : loadComparison(snap)}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                    >
                      <RotateCcw size={11} /> Load
                    </button>
                  )}
                  {confirmDeleteId === snap.id ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[11px] text-red-500 font-medium">Delete?</span>
                      <button onClick={() => { deleteSnapshot(snap.id); setConfirmDeleteId(null) }}
                        className="text-[11px] font-bold text-red-500 hover:text-red-600">Yes</button>
                      <button onClick={() => setConfirmDeleteId(null)}
                        className="text-[11px] font-bold text-gray-400 hover:text-gray-600">No</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(snap.id)}
                      className="shrink-0 text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
