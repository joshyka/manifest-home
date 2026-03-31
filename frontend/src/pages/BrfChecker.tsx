import { useState } from 'react'
import { X, Pencil, ChevronDown, ChevronUp } from 'lucide-react'
import { useBlob } from '../lib/useBlob'

interface BrfEntry {
  id: string
  name: string
  address: string
  owns_land: 'yes' | 'no' | ''
  andel_skuld: number
  monthly_fee: number
  apartment_sqm: number
  date: string
}

type Score = 'green' | 'amber' | 'red'

const SCORE_STYLE: Record<Score, { bg: string; text: string; label: string; dot: string }> = {
  green: { bg: 'bg-teal-50',  text: 'text-teal-700',  label: 'Good',    dot: 'bg-teal-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'OK',      dot: 'bg-amber-400' },
  red:   { bg: 'bg-red-50',   text: 'text-red-700',   label: 'Warning', dot: 'bg-red-500' },
}

function scoreLand(v: string): Score         { return v === 'yes' ? 'green' : v === 'no' ? 'red' : 'amber'}
function scoreDebt(v: number): Score         { return v < 3000 ? 'green' : v < 8000 ? 'amber' : 'red' }
function scoreFeePerSqm(v: number): Score    { return v < 50 ? 'green' : v < 75 ? 'amber' : 'red' }

function overall(scores: Score[]): Score {
  if (scores.filter(s => s === 'red').length >= 2) return 'red'
  if (scores.some(s => s === 'red') || scores.filter(s => s === 'amber').length >= 2) return 'amber'
  return 'green'
}

function fmt(n: number) { return n.toLocaleString('sv-SE') }

// ── Card ──────────────────────────────────────────────────────────────────────
function BrfCard({ entry, onDelete, onEdit }: {
  entry: BrfEntry
  onDelete: (id: string) => void
  onEdit: (entry: BrfEntry) => void
}) {
  const [expanded, setExpanded]           = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const feePerSqm  = entry.monthly_fee && entry.apartment_sqm
    ? Math.round(entry.monthly_fee / entry.apartment_sqm)
    : null

  const debtPerSqm = entry.andel_skuld && entry.apartment_sqm
    ? Math.round(entry.andel_skuld / entry.apartment_sqm)
    : null

  const landScore    = entry.owns_land ? scoreLand(entry.owns_land) : null
  const debtScore    = debtPerSqm ? scoreDebt(debtPerSqm) : null
  const feeScore     = feePerSqm ? scoreFeePerSqm(feePerSqm) : null

  const filledScores = [landScore, debtScore, feeScore].filter(Boolean) as Score[]
  const os = SCORE_STYLE[overall(filledScores)]

  const ROWS = [
    {
      label: 'Owns the land',
      value: entry.owns_land === 'yes' ? 'Yes' : entry.owns_land === 'no' ? 'No' : '—',
      score: landScore ?? 'amber',
      tip: entry.owns_land === 'no'
        ? 'The BRF rents the land it sits on. This fee (tomträttsavgäld) is set by the city and can rise sharply — increasing your monthly cost without warning.'
        : entry.owns_land === 'yes'
        ? 'The BRF owns the land. No ground rent risk.'
        : 'Not set — check the Hemnet listing or ask the mäklare.',
    },
    {
      label: 'Debt per sqm',
      value: debtPerSqm ? `${fmt(debtPerSqm)} kr/m²` : '—',
      score: debtScore ?? 'amber',
      tip: debtPerSqm
        ? `${fmt(entry.andel_skuld)} kr ÷ ${entry.apartment_sqm} m² = ${fmt(debtPerSqm)} kr/m². ` + (
            debtPerSqm < 3000
              ? 'Low debt — the BRF is in a strong financial position.'
              : debtPerSqm < 8000
              ? 'Moderate debt — manageable, keep an eye on fee trends.'
              : 'High debt — monthly fees may increase to cover interest payments.'
          )
        : 'Enter your andel i föreningens skuld and apartment size to calculate.',
    },
    {
      label: 'Fee per sqm',
      value: feePerSqm ? `${fmt(feePerSqm)} kr/m²/mo` : entry.monthly_fee ? 'Enter apartment size' : '—',
      score: feeScore ?? 'amber',
      tip: feePerSqm
        ? feePerSqm < 50
          ? `${fmt(entry.monthly_fee)} kr/mo ÷ ${entry.apartment_sqm} m² = ${fmt(feePerSqm)} kr/m²/mo. Low fee — good value.`
          : feePerSqm < 75
          ? `${fmt(entry.monthly_fee)} kr/mo ÷ ${entry.apartment_sqm} m² = ${fmt(feePerSqm)} kr/m²/mo. Average — typical for Stockholm.`
          : `${fmt(entry.monthly_fee)} kr/mo ÷ ${entry.apartment_sqm} m² = ${fmt(feePerSqm)} kr/m²/mo. High fee relative to apartment size.`
        : 'Enter both månadsavgift and apartment size to calculate fee per sqm.',
    },
  ]

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className="font-black text-gray-900">{entry.name}</span>
          {entry.address && <p className="text-xs text-gray-400 mt-0.5">{entry.address}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className={`text-2xl font-black ${os.text}`}>{os.label}</div>
          <button onClick={() => setExpanded(e => !e)} className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-all">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={() => onEdit(entry)} className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-all">
            <Pencil size={13} />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-red-500 font-medium">Delete?</span>
              <button onClick={() => onDelete(entry.id)} className="text-[11px] font-bold text-red-500">Yes</button>
              <button onClick={() => setConfirmDelete(false)} className="text-[11px] font-bold text-gray-400">No</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex gap-1.5 flex-wrap">
        {ROWS.filter(r => r.value !== '—').map(r => (
          <span key={r.label} className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${SCORE_STYLE[r.score].bg} ${SCORE_STYLE[r.score].text}`}>
            {r.label}: {r.value}
          </span>
        ))}
      </div>

      {/* Expanded breakdown */}
      {expanded && (
        <div className="space-y-2 pt-1">
          {ROWS.map(r => (
            <div key={r.label} className={`rounded-xl px-3 py-2.5 flex items-center justify-between gap-3 ${SCORE_STYLE[r.score].bg}`}>
              <div className="flex-1">
                <div className="text-sm font-bold text-gray-800">{r.label}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{r.tip}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-base font-black text-gray-900">{r.value}</div>
                <div className={`text-[11px] font-bold ${SCORE_STYLE[r.score].text}`}>{SCORE_STYLE[r.score].label}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Form ──────────────────────────────────────────────────────────────────────
function BrfForm({ initial, onSave, onCancel }: {
  initial?: BrfEntry
  onSave: (data: Omit<BrfEntry, 'id' | 'date'>) => void
  onCancel?: () => void
}) {
  const [name,       setName]       = useState(initial?.name || '')
  const [address,    setAddress]    = useState(initial?.address || '')
  const [ownsLand,   setOwnsLand]   = useState<'yes' | 'no' | ''>(initial?.owns_land || 'no')
  const [debt,       setDebt]       = useState(initial?.andel_skuld?.toString() || '')
  const [fee,        setFee]        = useState(initial?.monthly_fee?.toString() || '')
  const [aptSqm,     setAptSqm]     = useState(initial?.apartment_sqm?.toString() || '')
  const [touched,    setTouched]    = useState(false)
  const [checked,    setChecked]    = useState(false)

  return (
    <div className="card border-teal-100 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label !text-green-600">BRF Name <span className="text-red-400">*</span></label>
          <input
            className={`input ${touched && !name.trim() ? 'border-red-300 focus:border-red-400' : ''}`}
            placeholder="e.g. BRF Solsidan"
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            autoFocus
          />
          {touched && !name.trim() && (
            <p className="text-xs text-red-400 mt-1">Name is required</p>
          )}
        </div>
        <div>
          <label className="label !text-green-600">Address</label>
          <input className="input" placeholder="e.g. Folkungagatan 45, Stockholm" value={address} onChange={e => setAddress(e.target.value)} />
        </div>
        <div>
          <label className="label !text-green-600">Andel i föreningens skuld (kr)</label>
          <input type="number" className="input" placeholder="e.g. 350000" min={0} value={debt} onChange={e => setDebt(e.target.value)} />
        </div>
        <div>
          <label className="label !text-green-600">Avgift / month</label>
          <input type="number" className="input" placeholder="e.g. 3500" min={0} value={fee} onChange={e => setFee(e.target.value)} />
        </div>
        <div>
          <label className="label !text-green-600">Apartment size (m²)</label>
          <input type="number" className="input" placeholder="e.g. 65" min={0} value={aptSqm} onChange={e => setAptSqm(e.target.value)} />
        </div>
        <div className="flex items-end pb-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="owns-land"
              checked={ownsLand === 'yes'}
              onChange={e => setOwnsLand(e.target.checked ? 'yes' : 'no')}
              className="w-4 h-4 rounded accent-teal-600 cursor-pointer"
            />
            <label htmlFor="owns-land" className="text-sm font-medium text-gray-700 cursor-pointer">
              Owns the land
            </label>
          </div>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          className={`btn-primary transition-all ${checked ? '!bg-teal-50 !text-teal-600 !border-teal-200 !border' : ''}`}
          onClick={() => {
            if (!name.trim()) { setTouched(true); return }
            onSave({
              name: name.trim(),
              address: address.trim(),
              owns_land: ownsLand,
              andel_skuld: parseFloat(debt) || 0,
              monthly_fee: parseFloat(fee) || 0,
              apartment_sqm: parseFloat(aptSqm) || 0,
            })
            if (!onCancel) {
              setName(''); setAddress(''); setOwnsLand('no'); setDebt(''); setFee(''); setAptSqm(''); setTouched(false)
              setChecked(true)
              setTimeout(() => setChecked(false), 2000)
            }
          }}
        >
          {checked ? '✓ Checked' : 'Check'}
        </button>
        {onCancel && <button className="btn-secondary" onClick={onCancel}>Cancel</button>}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function BrfChecker() {
  const [entries, saveEntries] = useBlob<BrfEntry[]>('brf_checks', [])
  const [editing, setEditing]  = useState<BrfEntry | null>(null)

  function addEntry(data: Omit<BrfEntry, 'id' | 'date'>) {
    saveEntries([...entries, { ...data, id: crypto.randomUUID().slice(0, 8), date: new Date().toLocaleDateString('sv-SE') }])
  }

  function saveEdit(data: Omit<BrfEntry, 'id' | 'date'>) {
    if (!editing) return
    saveEntries(entries.map(e => e.id === editing.id ? { ...e, ...data } : e))
    setEditing(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">BRF Checker</h1>
        <p className="text-sm text-gray-400 mt-0.5">Evaluate a BRF's financial health before bidding</p>
      </div>

      {editing
        ? <BrfForm initial={editing} onSave={saveEdit} onCancel={() => setEditing(null)} />
        : <BrfForm onSave={addEntry} />
      }

      <div className="space-y-4">
        {entries.map(e => (
          <BrfCard key={e.id} entry={e} onDelete={id => saveEntries(entries.filter(e => e.id !== id))} onEdit={setEditing} />
        ))}
      </div>
    </div>
  )
}
