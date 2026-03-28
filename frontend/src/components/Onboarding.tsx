import { useState } from 'react'
import { settings as settingsApi } from '../lib/api'
import { useQueryClient } from '@tanstack/react-query'

interface Props {
  onComplete: () => void
}

const STEPS = ['Welcome', "Who's buying?", 'Your savings', 'Your target']

export default function Onboarding({ onComplete }: Props) {
  const qc = useQueryClient()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  const [p1Name,        setP1Name]        = useState('')
  const [p2Name,        setP2Name]        = useState('')
  const [p1Current,     setP1Current]     = useState('')
  const [p2Current,     setP2Current]     = useState('')
  const [p1Monthly,     setP1Monthly]     = useState('')
  const [p2Monthly,     setP2Monthly]     = useState('')
  const [aptPrice,      setAptPrice]      = useState('')
  const [downPct,       setDownPct]       = useState('15')
  const [loanAmount,    setLoanAmount]    = useState('')
  const [loanBank,      setLoanBank]      = useState('')
  const [loanExpiry,    setLoanExpiry]    = useState('')

  function next() { setStep(s => s + 1) }
  function skip() {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else finish()
  }

  async function finish() {
    setSaving(true)
    try {
      await settingsApi.update({
        p1_name:         p1Name.trim(),
        p2_name:         p2Name.trim(),
        p1_current:      parseInt(p1Current)  || 0,
        p2_current:      parseInt(p2Current)  || 0,
        p1_monthly:      parseInt(p1Monthly)  || 0,
        p2_monthly:      parseInt(p2Monthly)  || 0,
        apartment_price: parseInt(aptPrice)   || 0,
        down_pct:        parseFloat(downPct)  || 15,
        loan_amount:     parseInt(loanAmount) || 0,
        loan_bank:       loanBank.trim(),
        loan_expiry:     loanExpiry,
      })
      qc.invalidateQueries()
    } catch {}
    setSaving(false)
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface">
      <div className="bg-white rounded-3xl shadow-card w-full max-w-md p-8 space-y-6">

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full transition-all ${
                i <= step ? 'bg-teal-600' : 'bg-gray-200'
              }`} />
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-200" />}
            </div>
          ))}
        </div>

        {/* Step 0 — Welcome */}
        {step === 0 && (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto text-2xl"
                 style={{ background: '#F0FAF4', border: '1px solid #D1EAD8' }}>
              🏡
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Welcome to KeyJourney</h1>
              <p className="text-sm text-gray-400 mt-2">
                Track your savings, log viewings, compare listings and manage your home buying journey — all in one place.
              </p>
            </div>
            <p className="text-xs text-gray-400">Takes about 2 minutes to set up. You can skip any step.</p>
            <button onClick={next}
              className="w-full py-3 rounded-full text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-all active:scale-95">
              Get started →
            </button>
            <button onClick={onComplete}
              className="w-full py-2 text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors">
              Go to dashboard
            </button>
          </div>
        )}

        {/* Step 1 — Names */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-black text-gray-900">Who's buying?</h2>
              <p className="text-sm text-gray-400 mt-1">Enter your names so the app knows who's who.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Buyer 1 name</label>
                <input className="input" placeholder="e.g. Alex" value={p1Name}
                  onChange={e => setP1Name(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="label">Buyer 2 name <span className="text-gray-300 font-normal">(optional)</span></label>
                <input className="input" placeholder="e.g. Sam" value={p2Name}
                  onChange={e => setP2Name(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={next} disabled={!p1Name.trim()}
                className="flex-1 py-3 rounded-full text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 transition-all active:scale-95">
                Next →
              </button>
              <button onClick={skip} className="px-5 py-3 rounded-2xl text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors">
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Savings */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-black text-gray-900">Your savings</h2>
              <p className="text-sm text-gray-400 mt-1">How much have you saved so far, and how much do you save monthly?</p>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{p1Name || 'Buyer 1'} — saved (kr)</label>
                  <input type="number" className="input" placeholder="e.g. 200000" value={p1Current}
                    onChange={e => setP1Current(e.target.value)} autoFocus />
                </div>
                <div>
                  <label className="label">{p1Name || 'Buyer 1'} — monthly (kr)</label>
                  <input type="number" className="input" placeholder="e.g. 8000" value={p1Monthly}
                    onChange={e => setP1Monthly(e.target.value)} />
                </div>
              </div>
              {p2Name && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">{p2Name} — saved (kr)</label>
                    <input type="number" className="input" placeholder="e.g. 150000" value={p2Current}
                      onChange={e => setP2Current(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">{p2Name} — monthly (kr)</label>
                    <input type="number" className="input" placeholder="e.g. 6000" value={p2Monthly}
                      onChange={e => setP2Monthly(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={next}
                className="flex-1 py-3 rounded-full text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-all active:scale-95">
                Next →
              </button>
              <button onClick={skip} className="px-5 py-3 rounded-2xl text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors">
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Target */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-black text-gray-900">Your target</h2>
              <p className="text-sm text-gray-400 mt-1">What apartment price are you aiming for? Loan details are optional.</p>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Apartment price (kr)</label>
                  <input type="number" className="input" placeholder="e.g. 3500000" value={aptPrice}
                    onChange={e => setAptPrice(e.target.value)} autoFocus />
                </div>
                <div>
                  <label className="label">Down payment %</label>
                  <input type="number" className="input" min={10} max={100} value={downPct}
                    onChange={e => setDownPct(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Lånelöfte amount (kr) <span className="text-gray-300 font-normal">(optional)</span></label>
                  <input type="number" className="input" placeholder="e.g. 3000000" value={loanAmount}
                    onChange={e => setLoanAmount(e.target.value)} />
                </div>
                <div>
                  <label className="label">Bank <span className="text-gray-300 font-normal">(optional)</span></label>
                  <input className="input" placeholder="e.g. SEB" value={loanBank}
                    onChange={e => setLoanBank(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Lånelöfte expiry <span className="text-gray-300 font-normal">(optional)</span></label>
                <input type="date" className="input" value={loanExpiry}
                  onChange={e => setLoanExpiry(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={finish} disabled={saving}
                className="flex-1 py-3 rounded-full text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 transition-all active:scale-95">
                {saving ? 'Saving…' : 'Done — go to dashboard →'}
              </button>
              <button onClick={skip} disabled={saving}
                className="px-5 py-3 rounded-2xl text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors">
                Skip
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
