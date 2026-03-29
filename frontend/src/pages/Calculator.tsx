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
    good:     { icon: <CheckCircle size={16} />, bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-700',  label: 'Good',     desc: 'Well within typical bank limits' },
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
    const combined = (savedSettings.p1_monthly || 0) + (savedSettings.p2_monthly || 0)
    setIncome(Math.round(combined * 2.5)) // rough estimate
    setUseOwn(true)
  }

  const result = calculate(price, downPct, rate, avgift, drift, income)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Cost Calculator</h1>
          <p className="text-sm text-gray-400 mt-0.5">Estimate your monthly costs and affordability</p>
        </div>
        {(savedSettings?.apartment_price ?? 0) > 0 && !useOwn && (
          <button className="btn-secondary text-xs" onClick={loadFromSettings}>
            Load from my settings
          </button>
        )}
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* ── Inputs ─────────────────────────────────────────────────────── */}
        <div className="col-span-2 space-y-4">

          {/* Apartment */}
          <div className="card space-y-4">
            <div className="section-label">Property</div>
            <div>
              <label className="label">Apartment Price (SEK)</label>
              <input type="number" className="input" min={0} step={50000} placeholder="e.g. 4 500 000"
                value={price || ''} onChange={e => setPrice(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="label">Down Payment %</label>
              <input type="number" className="input" min={10} max={100} step={1} placeholder="10"
                value={downPct || ''} onChange={e => setDownPct(parseFloat(e.target.value) || 10)} />
            </div>
            <div>
              <label className="label">Avgift (SEK/month)</label>
              <input type="number" className="input" min={0} step={100} placeholder="e.g. 4 500"
                value={avgift || ''} onChange={e => setAvgift(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="label">Other monthly costs (SEK)</label>
              <input type="number" className="input" min={0} step={500} placeholder="e.g. 1 500"
                value={drift || ''} onChange={e => setDrift(parseInt(e.target.value) || 0)} />
              <p className="text-[11px] text-gray-300 mt-1">Electricity, internet, home insurance, etc.</p>
            </div>
          </div>

          {/* Loan */}
          <div className="card space-y-4">
            <div className="section-label">Mortgage</div>
            <div>
              <label className="label">Interest Rate % (annual)</label>
              <input type="number" className="input" min={0} max={20} step={0.1} placeholder="e.g. 3,5"
                value={rate || ''} onChange={e => setRate(parseFloat(e.target.value) || 0)} />
              <p className="text-[11px] text-gray-300 mt-1">Current Swedish 3-month rate ~3–4%. Banks stress-test at 7%.</p>
            </div>
            <div>
              <label className="label">Combined Gross Monthly Income (SEK)</label>
              <input type="number" className="input" min={0} step={5000} placeholder="e.g. 80 000"
                value={income || ''} onChange={e => setIncome(parseInt(e.target.value) || 0)} />
              <p className="text-[11px] text-gray-300 mt-1">Combined gross salaries of both buyers. Used to check the 4.5× income limit.</p>
            </div>
          </div>
        </div>

        {/* ── Results ────────────────────────────────────────────────────── */}
        <div className="col-span-3 space-y-4">
          {!result ? (
            <div className="card flex flex-col items-center justify-center h-64 text-center">
              <TrendingUp size={32} className="text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">Enter a price to calculate your monthly costs.</p>
            </div>
          ) : (
            <>
              {/* Affordability badge */}
              {income > 0 && <AffordabilityBadge status={result.affordability} lti={result.loanToIncome} />}

              {/* Loan summary */}
              <div className="card">
                <div className="section-label mb-4">Loan Summary</div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Loan Amount',   value: `${fmt(result.loanAmount)} kr` },
                    { label: 'LTV',           value: `${result.ltv.toFixed(1)}%` },
                    { label: 'Down Payment',  value: `${fmt(result.downPayment)} kr` },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-2xl p-3 text-center">
                      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</div>
                      <div className="text-base font-black text-gray-900 mt-1 tabular-nums">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monthly cost breakdown */}
              <div className="card">
                <div className="section-label mb-2">Monthly Cost Breakdown</div>

                <Row
                  label="Interest"
                  sub={`${rate}% on ${fmt(result.loanAmount)} kr`}
                  value={`${fmt(result.monthlyInterestGross)} kr`}
                />
                <Row
                  label="Amortisation"
                  sub={result.amortisationRate > 0
                    ? `${result.amortisationRate}% / year — LTV ${result.ltv.toFixed(0)}% (Finansinspektionen rule)`
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
                    <div className="font-black text-gray-900 text-sm">Total monthly cost</div>
                    <div className="text-[11px] text-gray-400">Interest + amortisation + fees</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-black text-teal-600 tabular-nums">
                      {fmt(result.totalMonthly)} kr
                    </div>
                    <button className="btn-secondary text-xs" onClick={saveSnapshot} title="Save snapshot">
                      <Save size={13} /> Save
                    </button>
                  </div>
                </div>
              </div>

              {/* Stress test */}
              <div className="card border-amber-100 bg-amber-50/40">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-amber-800 mb-0.5">Bank stress test @ 7%</div>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      Before approving your mortgage, Swedish banks check if you could <strong>still afford the payments if interest rates rose to 7%</strong> — even if today's rate is lower. This is what your monthly cost would look like in that scenario. If this number is too high relative to your income, the bank may offer you a smaller loan.
                    </p>
                    <div className="text-xl font-black text-amber-700 mt-2 tabular-nums">
                      {fmt(result.stressTestMonthly)} kr / month
                    </div>
                    {income > 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        = {((result.stressTestMonthly / income) * 100).toFixed(0)}% of your gross monthly income
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Swedish rules info */}
              <div className="card bg-teal-50/40 border-teal-100">
                <div className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-3">Swedish Rules Applied</div>
                <div className="space-y-2 text-xs text-teal-800">
                  <div className="flex items-start gap-2">
                    <span className="font-bold shrink-0">Kontantinsats:</span>
                    <span>Minimum 10% down payment required by law (Bolånelagen)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold shrink-0">Amorteringskrav:</span>
                    <span>
                      {result.ltv > 70 ? '2%/year (LTV > 70%)' : result.ltv > 50 ? '1%/year (LTV 50–70%)' : 'None (LTV < 50%)'}
                      {result.extraAmortisationRate > 0 ? ' + 1%/year (loan > 4.5× income)' : ''}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold shrink-0">Kvar-att-leva-på:</span>
                    <span>Banks also check remaining disposable income — rule of thumb ~13,000–16,000 kr/person/month</span>
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
          <div className="section-label">Saved Snapshots</div>
          <div className="space-y-2">
            {snapshots.map(s => (
              <div key={s.id} className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-2xl text-sm">
                <div className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(s.savedAt).toLocaleDateString('en-SE', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                <div className="flex-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-600">
                  <span>{fmt(s.price)} kr · {s.downPct}% down · {s.rate}%</span>
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
