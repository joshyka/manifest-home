import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { settings as settingsApi } from '../lib/api'
import { useBlob } from '../lib/useBlob'
import { TrendingUp, AlertTriangle, CheckCircle, Info, Save, Trash2 } from 'lucide-react'

interface Snapshot {
  id: string
  savedAt: string
  price: number
  downPct: number
  rate: number
  avgift: number
  drift: number
  income: number
  totalMonthly: number
  stressTestMonthly: number
  loanAmount: number
  affordability: string
}

// ── Swedish mortgage calculation logic ────────────────────────────────────────

interface CalcResult {
  loanAmount: number
  ltv: number
  downPayment: number
  monthlyInterestGross: number
  amortisationRate: number
  monthlyAmortisation: number
  extraAmortisationRate: number
  monthlyExtraAmortisation: number
  totalMonthly: number
  loanToIncome: number
  stressTestMonthly: number
  affordability: 'good' | 'moderate' | 'tight'
}

function calculate(
  price: number,
  downPct: number,
  interestRate: number,
  avgift: number,
  drift: number,
  grossMonthlyIncome: number,
): CalcResult | null {
  if (price <= 0 || downPct < 10) return null

  const downPayment = Math.round(price * downPct / 100)
  const loanAmount  = price - downPayment
  const ltv         = (loanAmount / price) * 100

  // Monthly interest (gross)
  const monthlyInterestGross = Math.round(loanAmount * (interestRate / 100) / 12)

  // Amortisation (Finansinspektionen rules)
  let amortisationRate = 0
  if (ltv > 70) amortisationRate = 2
  else if (ltv > 50) amortisationRate = 1

  // Extra amortisation if loan > 4.5× gross annual income
  const grossAnnualIncome = grossMonthlyIncome * 12
  let extraAmortisationRate = 0
  if (grossAnnualIncome > 0 && loanAmount > 4.5 * grossAnnualIncome) {
    extraAmortisationRate = 1
  }

  const monthlyAmortisation      = Math.round(loanAmount * (amortisationRate / 100) / 12)
  const monthlyExtraAmortisation = Math.round(loanAmount * (extraAmortisationRate / 100) / 12)

  const totalMonthly = monthlyInterestGross + monthlyAmortisation + monthlyExtraAmortisation + avgift + drift

  // Loan-to-income ratio
  const loanToIncome = grossAnnualIncome > 0 ? loanAmount / grossAnnualIncome : 0

  // Stress test: banks test affordability at 7% interest
  const stressInterest  = Math.round(loanAmount * 0.07 / 12)
  const stressTestMonthly = stressInterest + monthlyAmortisation + monthlyExtraAmortisation + avgift + drift

  // Affordability rating
  let affordability: 'good' | 'moderate' | 'tight'
  if (loanToIncome < 4) affordability = 'good'
  else if (loanToIncome <= 4.5) affordability = 'moderate'
  else affordability = 'tight'

  return {
    loanAmount, ltv, downPayment,
    monthlyInterestGross,
    amortisationRate, monthlyAmortisation,
    extraAmortisationRate, monthlyExtraAmortisation,
    totalMonthly, loanToIncome, stressTestMonthly, affordability,
  }
}

// ── Helper components ─────────────────────────────────────────────────────────

function fmt(n: number) { return Math.round(n).toLocaleString('sv-SE') }

function Row({ label, value, sub, bold, green, muted }: {
  label: string; value: string; sub?: string
  bold?: boolean; green?: boolean; muted?: boolean
}) {
  return (
    <div className={`flex justify-between items-baseline py-3 border-b border-gray-50 last:border-0 text-sm ${muted ? 'opacity-50' : ''}`}>
      <div>
        <span className="text-gray-500">{label}</span>
        {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
      </div>
      <span className={`font-bold tabular-nums ${bold ? 'text-base text-gray-900' : green ? 'text-green-600' : 'text-gray-800'}`}>
        {value}
      </span>
    </div>
  )
}

function AffordabilityBadge({ status, lti }: { status: CalcResult['affordability']; lti: number }) {
  const config = {
    good:     { icon: <CheckCircle size={16} />, bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-700',  label: 'Good',     desc: '' },
    moderate: { icon: <Info size={16} />,        bg: 'bg-amber-50',  border: 'border-amber-200', text: 'text-amber-700', label: 'Moderate', desc: 'At the edge of 4.5× income rule' },
    tight:    { icon: <AlertTriangle size={16}/>, bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-700',   label: 'Tight',    desc: 'Exceeds 4.5× — bank may add extra amortisation' },
  }[status]

  return (
    <div className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl border ${config.bg} ${config.border} ${config.text}`}>
      <div className="mt-0.5 shrink-0">{config.icon}</div>
      <div>
        <div className="font-bold text-sm">{config.label} — {lti.toFixed(1)}× income</div>
        <div className="text-xs mt-0.5 opacity-80">{config.desc}</div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Calculator() {
  const { data: savedSettings } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })

  const [price,       setPrice]       = useState(0)
  const [downPct,     setDownPct]     = useState(10)
  const [rate,        setRate]        = useState(0)
  const [avgift,      setAvgift]      = useState(0)
  const [drift,       setDrift]       = useState(0)
  const [income,      setIncome]      = useState(0)
  const [netIncome,   setNetIncome]   = useState(0)
  const [useOwn,      setUseOwn]      = useState(false)
  const [snapshots, saveSnapshots] = useBlob<Snapshot[]>('calc_snapshots', [])

  function saveSnapshot() {
    if (!result) return
    const snap: Snapshot = {
      id: Math.random().toString(36).slice(2, 10),
      savedAt: new Date().toISOString(),
      price, downPct, rate, avgift, drift, income,
      totalMonthly: result.totalMonthly,
      stressTestMonthly: result.stressTestMonthly,
      loanAmount: result.loanAmount,
      affordability: result.affordability,
    }
    saveSnapshots([snap, ...snapshots].slice(0, 10))
  }

  function deleteSnapshot(id: string) {
    saveSnapshots(snapshots.filter(s => s.id !== id))
  }

  // Optionally pre-fill from saved savings settings
  function loadFromSettings() {
    if (!savedSettings) return
    setPrice(savedSettings.apartment_price || 0)
    setDownPct(savedSettings.down_pct || 10)
    setUseOwn(true)
  }

  const result = calculate(price, downPct, rate, avgift, drift, income)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Calculator</h1>
          <p className="text-sm text-gray-400 mt-0.5">Estimate your monthly costs and affordability</p>
        </div>
        {(savedSettings?.apartment_price ?? 0) > 0 && !useOwn && (
          <button className="btn-secondary text-xs" onClick={loadFromSettings}>
            Auto-fill
          </button>
        )}
      </div>

      <div className="grid grid-cols-5 gap-5 items-start">
        {/* ── Inputs ─────────────────────────────────────────────────────── */}
        <div className="col-span-2 space-y-4">

          {/* Apartment */}
          <div className="card space-y-4">
            <div className="section-label">Property</div>
            <div>
              <label className="label !text-green-600">Target Apartment Price (SEK)</label>
              <input type="number" className="input" min={0} step={50000} placeholder="e.g. 4 500 000"
                value={price || ''} onChange={e => setPrice(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="label !text-green-600">Down Payment %</label>
              <input type="number" className="input" min={10} max={100} step={1} placeholder="10"
                value={downPct || ''} onChange={e => setDownPct(parseFloat(e.target.value) || 10)} />
            </div>
            <div>
              <label className="label !text-green-600">Avgift / month</label>
              <input type="number" className="input" min={0} step={100} placeholder="e.g. 4 500"
                value={avgift || ''} onChange={e => setAvgift(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="label !text-green-600">Other costs / month</label>
              <input type="number" className="input" min={0} step={500} placeholder="e.g. 1 500"
                value={drift || ''} onChange={e => setDrift(parseInt(e.target.value) || 0)} />
            </div>
          </div>

          {/* Loan */}
          <div className="card space-y-4">
            <div className="section-label">Mortgage</div>
            <div>
              <label className="label !text-green-600">Interest Rate % (annual)</label>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={10} step={0.1}
                  value={rate}
                  onChange={e => setRate(parseFloat(e.target.value))}
                  className="flex-1 green-slider" />
                <span className="text-sm text-gray-600 w-12 text-right tabular-nums">{rate.toFixed(1)}%</span>
              </div>
            </div>
            <div>
              <label className="label !text-green-600">Combined Gross / Month (SEK)</label>
              <input type="number" className="input" min={0} step={5000} placeholder="e.g. 80 000"
                value={income || ''} onChange={e => setIncome(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="label !text-green-600">Combined Net / Month (SEK)</label>
              <input type="number" className="input" min={0} step={5000} placeholder="e.g. 55 000"
                value={netIncome || ''} onChange={e => setNetIncome(parseInt(e.target.value) || 0)} />
            </div>
          </div>
        </div>

        {/* ── Results ────────────────────────────────────────────────────── */}
        <div className="col-span-3 space-y-4">
          {!result ? (
            <div className="card flex flex-col items-center justify-center text-center" >
              <TrendingUp size={32} className="text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">Enter a price to calculate your monthly costs.</p>
            </div>
          ) : (
            <>
              {/* Affordability badge */}
              {income > 0 && <AffordabilityBadge status={result.affordability} lti={result.loanToIncome} />}

              {/* Loan summary */}
              <div className="card">
                <div className="section-label mb-4">Summary</div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Loan Amount',   value: `${fmt(result.loanAmount)} kr` },
                    { label: 'LTV',           value: `${result.ltv.toFixed(1)}%` },
                    { label: 'Down Payment',  value: `${fmt(result.downPayment)} kr` },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-2xl p-3 text-center">
                      <div className="text-[11px] font-bold text-green-600 uppercase tracking-wider">{label}</div>
                      <div className="text-base font-black text-gray-900 mt-1 tabular-nums">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monthly cost breakdown */}
              <div className="card">
                <div className="flex items-center justify-between mb-2">
                  <div className="section-label">Monthly Cost Breakdown</div>
                  <button className="btn-secondary !px-3" onClick={saveSnapshot} title="Save snapshot">
                    <Save size={14} />
                  </button>
                </div>

                <Row
                  label="Interest"
                  sub={`${rate}% on ${fmt(result.loanAmount)} kr`}
                  value={`${fmt(result.monthlyInterestGross)} kr`}
                />
                <Row
                  label="Amortisation"
                  sub={result.amortisationRate > 0
                    ? `${result.amortisationRate}% / year — LTV ${result.ltv.toFixed(0)}%`
                    : 'LTV < 50% — no requirement'}
                  value={`${fmt(result.monthlyAmortisation)} kr`}
                  muted={result.amortisationRate === 0}
                />
                {result.extraAmortisationRate > 0 && (
                  <Row
                    label="Extra amortisation"
                    sub={`+1% / year — loan exceeds 4.5× gross income`}
                    value={`${fmt(result.monthlyExtraAmortisation)} kr`}
                  />
                )}
                <Row
                  label="Avgift"
                  value={`${fmt(avgift)} kr`}
                  muted={avgift === 0}
                />
                <Row
                  label="Others"
                  value={`${fmt(drift)} kr`}
                  muted={drift === 0}
                />

                {/* Total */}
                <div className="flex justify-between items-center mt-3 pt-4 border-t-2 border-gray-100">
                  <div>
                    <div className="text-gray-500 text-sm">Total monthly cost</div>
                    <div className="text-[11px] text-gray-400">Interest + amortisation + avgift</div>
                  </div>
                  <div className="text-base font-black text-teal-600 tabular-nums">
                    {fmt(result.totalMonthly)} kr
                  </div>
                </div>

                {/* Disposable income */}
                {netIncome > 0 && (() => {
                  const leftover = netIncome - result.totalMonthly
                  const color = leftover >= 15000 ? 'text-green-600' : leftover >= 8000 ? 'text-amber-600' : 'text-red-500'
                  return (
                    <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                      <div>
                        <div className="text-gray-500 text-sm">Net household cash flow</div>
                      </div>
                      <div className={`text-base font-black tabular-nums ${color}`}>{fmt(leftover)} kr</div>
                    </div>
                  )
                })()}
              </div>

              {/* Stress test */}
              <div className="card border-amber-100 bg-amber-50/40">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={15} className="text-amber-500 shrink-0" />
                    <div>
                      <p className="text-xs text-amber-700 font-medium">Stress-tested at 7% as required by Swedish banks.</p>
                      {income > 0 && (
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[11px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            Gross {((result.stressTestMonthly / income) * 100).toFixed(0)}%
                          </span>
                          {netIncome > 0 && (
                            <span className="text-[11px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                              Net {((result.stressTestMonthly / netIncome) * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-base font-black text-amber-700 tabular-nums shrink-0">
                    {fmt(result.stressTestMonthly)} kr
                  </div>
                </div>
              </div>


            </>
          )}
        </div>
      </div>

      {/* Saved snapshots */}
      {snapshots.length > 0 && (
        <div className="card space-y-3">
          <div className="section-label">Previous Calculations</div>
          <div className="space-y-2">
            {snapshots.map(s => (
              <div key={s.id} className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-2xl text-sm">
                <div className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(s.savedAt).toLocaleDateString('en-SE', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                <div className="flex-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-600">
                  <span>{fmt(s.price)} kr · {s.downPct}% down · {s.rate}% interest</span>
                  <span className="font-bold text-teal-700">{fmt(s.totalMonthly)} kr/mo</span>
                  <span className="text-amber-600">stress: {fmt(s.stressTestMonthly)} kr</span>
                </div>
                <button onClick={() => deleteSnapshot(s.id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
