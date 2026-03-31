import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { settings as settingsApi, dashboard as dashboardApi } from '../lib/api'
import type { Settings } from '../lib/api'
import Alert from '../components/Alert'
import { Pencil, X, Check, TrendingUp } from 'lucide-react'

function fmt(n: number) { return n.toLocaleString('sv-SE') }

export default function Savings() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Settings | null>(null)
  const [saved, setSaved] = useState(false)

  const { data: s, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })
  const { data: dashData } = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.get })

  const mutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      qc.invalidateQueries()
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  function startEdit() {
    if (s) setForm({ ...s })
    setEditing(true)
  }

  function set(key: keyof Settings, value: string | number) {
    setForm(f => f ? { ...f, [key]: value } : f)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form) mutation.mutate(form)
  }

  const projDisplay = (dashData?.projection ?? [])

  if (isLoading || !s) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const target = Math.round(s.apartment_price * s.down_pct / 100)

  // Loan status
  let loanAlertKind: 'success' | 'warning' | 'danger' | undefined
  let loanAlertMsg = ''
  if (s.loan_expiry && s.loan_expiry !== 'nan' && s.loan_expiry !== '') {
    const expiry = new Date(s.loan_expiry)
    const days = Math.round((expiry.getTime() - Date.now()) / 86_400_000)
    if (days <= 0) {
      loanAlertKind = 'danger'
      loanAlertMsg = 'Lånelöfte has expired. Renew immediately before making any bids.'
    } else if (days <= 30) {
      loanAlertKind = 'warning'
      loanAlertMsg = `Lånelöfte expires in ${days} days. Contact ${s.loan_bank || 'your bank'} to renew.`
    } else {
      loanAlertKind = 'success'
      loanAlertMsg = `Lånelöfte valid for ${days} more days${s.loan_bank ? ` via ${s.loan_bank}` : ''}. Amount: ${fmt(s.loan_amount)} kr.`
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Savings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Monitor your savings progress.</p>
      </div>

      {/* Alerts */}
      {saved && <Alert kind="success">Settings saved successfully.</Alert>}
      {loanAlertKind && <Alert kind={loanAlertKind}>{loanAlertMsg}</Alert>}

      {/* View mode */}
      {!editing && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="section-label !mb-0">Savings Plan</div>
            <button className="p-2 rounded-xl text-teal-600 hover:bg-teal-50 transition-colors" onClick={startEdit} title="Edit">
              <Pencil size={18} />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              ['Target Price', `${fmt(s.apartment_price)} kr`],
              ['Down Payment %', `${s.down_pct}%  —  target ${fmt(target)} kr`],
              [`${s.p1_name || 'You'} — Total Savings`, `${fmt(s.p1_current)} kr`],
              [`${s.p1_name || 'You'} — Monthly Savings`, `${fmt(s.p1_monthly)} kr`],
              [`${s.p2_name || 'Partner'} — Total Savings`, `${fmt(s.p2_current)} kr`],
              [`${s.p2_name || 'Partner'} — Monthly Savings`, `${fmt(s.p2_monthly)} kr`],
              ['Loan Promise', s.loan_amount ? `${fmt(s.loan_amount)} kr` : '0 kr'],
              ['Loan Promise Expiry', s.loan_expiry && s.loan_expiry !== 'nan' ? new Date(s.loan_expiry).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : 'dd-mm-yy'],
              ['Bank', s.loan_bank && s.loan_bank !== 'nan' ? s.loan_bank : 'Not set'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-baseline py-3 text-sm">
                <span className="text-gray-600 font-medium">{label}</span>
                <span className="font-bold text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit mode */}
      {editing && form && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Target Apartment */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <div className="section-label !mb-0">Savings Plan</div>
              <div className="flex items-center gap-1">
                <button type="submit" disabled={mutation.isPending} className="p-2 rounded-xl text-teal-600 hover:bg-teal-50 transition-colors" title="Save">
                  <Check size={18} />
                </button>
                <button type="button" onClick={() => setEditing(false)} className="p-2 rounded-xl text-red-400 hover:bg-red-50 transition-colors" title="Cancel">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="section-label">Target Apartment</div>
            <p className="text-xs text-gray-500 -mt-2">
              Sets your down payment target. Minimum 10% required in Sweden.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label !text-green-600">Apartment Price (SEK)</label>
                <input
                  type="number" className="input" min={0} step={50000}
                  placeholder="e.g. 4000000"
                  value={form.apartment_price || ''}
                  onChange={e => set('apartment_price', parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="label !text-green-600">Down Payment %</label>
                <input
                  type="number" className="input" min={10} max={50} step={0.5}
                  placeholder="e.g. 10"
                  value={form.down_pct || ''}
                  onChange={e => set('down_pct', parseFloat(e.target.value) || 10)}
                />
              </div>
            </div>
          </div>

          {/* Savings per person */}
          <div className="card space-y-4">
            <div className="section-label">Your Savings</div>
            <p className="text-xs text-gray-500 -mt-2">
              Enter how much each of you has saved and contributes monthly.
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label !text-green-600">Your Name</label>
                <input type="text" className="input" value={form.p1_name}
                  onChange={e => set('p1_name', e.target.value)} />
              </div>
              <div>
                <label className="label !text-green-600">{form.p1_name || 'You'} — Total Savings</label>
                <input type="number" className="input" min={0} step={10000} placeholder="e.g. 150000"
                  value={form.p1_current || ''}
                  onChange={e => set('p1_current', parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className="label !text-green-600">{form.p1_name || 'You'} — Monthly Savings</label>
                <input type="number" className="input" min={0} step={1000} placeholder="e.g. 10000"
                  value={form.p1_monthly || ''}
                  onChange={e => set('p1_monthly', parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className="label !text-green-600">Your Partner's Name</label>
                <input type="text" className="input" value={form.p2_name}
                  onChange={e => set('p2_name', e.target.value)} />
              </div>
              <div>
                <label className="label !text-green-600">{form.p2_name || 'Partner'} — Total Savings</label>
                <input type="number" className="input" min={0} step={10000} placeholder="e.g. 150000"
                  value={form.p2_current || ''}
                  onChange={e => set('p2_current', parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className="label !text-green-600">{form.p2_name || 'Partner'} — Monthly Savings</label>
                <input type="number" className="input" min={0} step={1000} placeholder="e.g. 10000"
                  value={form.p2_monthly || ''}
                  onChange={e => set('p2_monthly', parseInt(e.target.value) || 0)} />
              </div>
            </div>
          </div>

          {/* Lånelöfte */}
          <div className="card space-y-4">
            <div className="section-label">Lånelöfte (Loan Promise)</div>
            <p className="text-xs text-gray-500 -mt-2">
              Issued by your bank, valid for 3–6 months. Required before you can bid.
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label !text-green-600">Loan Promise Amount (SEK)</label>
                <input type="number" className="input" min={0} step={100000} placeholder="e.g. 3000000"
                  value={form.loan_amount || ''}
                  onChange={e => set('loan_amount', parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className="label !text-green-600">Expiry Date</label>
                <input type="date" className="input"
                  value={form.loan_expiry && form.loan_expiry !== 'nan' ? form.loan_expiry : ''}
                  onChange={e => set('loan_expiry', e.target.value)} />
              </div>
              <div>
                <label className="label !text-green-600">Bank</label>
                <input type="text" className="input"
                  placeholder="e.g. SEB, Swedbank, SBAB"
                  value={form.loan_bank && form.loan_bank !== 'nan' ? form.loan_bank : ''}
                  onChange={e => set('loan_bank', e.target.value)} />
              </div>
            </div>
          </div>

        </form>
      )}

      {/* Target month */}
      {(() => {
        const hit = projDisplay.find(r => r.gap <= 0)
        if (!hit || !s.apartment_price) return null
        const currentMonth = new Date().getMonth() + 1
        const isPast = hit.month_num < currentMonth
        return (
          <div className="card flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 flex items-center justify-center shrink-0">
              <TrendingUp size={18} className="text-teal-600" />
            </div>
            {isPast
              ? <p className="text-sm font-semibold text-teal-700">Target already met!</p>
              : <p className="text-sm font-semibold text-gray-900">On track to hit your target in <span className="text-teal-700">{hit.month}</span> <span className="text-gray-400 font-normal">(Q{Math.ceil(hit.month_num / 3)})</span></p>
            }
          </div>
        )
      })()}
    </div>
  )
}
