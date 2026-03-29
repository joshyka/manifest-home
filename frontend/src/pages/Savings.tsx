import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { settings as settingsApi, dashboard as dashboardApi } from '../lib/api'
import type { Settings, ProjectionRow } from '../lib/api'
import Alert from '../components/Alert'
import { Pencil, X, Check } from 'lucide-react'

function fmt(n: number) { return n.toLocaleString('sv-SE') }

function ProjectionTable({ rows }: { rows: ProjectionRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Month</th>
            <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Savings</th>
            <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Target</th>
            <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Gap</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr
              key={r.month}
              className={`border-b border-gray-50 ${r.is_current ? 'bg-teal-50' : ''}`}
            >
              <td className="py-2.5 px-3 font-medium text-gray-800">
                {r.month}
                {r.is_current && (
                  <span className="ml-2 text-[10px] font-bold bg-teal-500 text-white px-1.5 py-0.5 rounded-full">
                    Now
                  </span>
                )}
              </td>
              <td className="py-2.5 px-3 text-right font-semibold text-gray-800">{fmt(r.cumulative)} kr</td>
              <td className="py-2.5 px-3 text-right text-gray-500">{fmt(r.target)} kr</td>
              <td className={`py-2.5 px-3 text-right font-semibold ${r.gap <= 0 ? 'text-green-600' : 'text-amber-600'}`}>
                {r.gap <= 0 ? '✓ Met' : `${fmt(r.gap)} kr`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

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

  const currentMonth = new Date().getMonth() + 1
  const projDisplay = (dashData?.projection ?? []).filter(r => r.month_num >= currentMonth)

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
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Savings</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track your savings and loan status</p>
        </div>
        <div className="flex justify-end gap-2">
          {editing ? (
            <>
              <button className="btn-primary" onClick={() => form && mutation.mutate(form)} disabled={mutation.isPending}>
                <Check size={14} /> {mutation.isPending ? 'Saving…' : 'Save'}
              </button>
              <button className="btn-secondary" onClick={() => setEditing(false)}>
                <X size={14} /> Cancel
              </button>
            </>
          ) : (
            <button className="btn-primary" onClick={startEdit}>
              <Pencil size={14} /> Edit
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {saved && <Alert kind="success">Settings saved successfully.</Alert>}
      {loanAlertKind && <Alert kind={loanAlertKind}>{loanAlertMsg}</Alert>}

      {/* View mode */}
      {!editing && (
        <div className="card">
          <div className="divide-y divide-gray-50">
            {[
              ['Target Price', `${fmt(s.apartment_price)} kr`],
              ['Down Payment %', `${s.down_pct}%  —  target ${fmt(target)} kr`],
              [`${s.p1_name || 'Person 1'} — Total Savings`, `${fmt(s.p1_current)} kr`],
              [`${s.p1_name || 'Person 1'} — Monthly Savings`, `${fmt(s.p1_monthly)} kr`],
              [`${s.p2_name || 'Person 2'} — Total Savings`, `${fmt(s.p2_current)} kr`],
              [`${s.p2_name || 'Person 2'} — Monthly Savings`, `${fmt(s.p2_monthly)} kr`],
              ['Loan Promise', s.loan_amount ? `${fmt(s.loan_amount)} kr` : '0 kr'],
              ['Loan Promise Expiry', s.loan_expiry && s.loan_expiry !== 'nan' ? new Date(s.loan_expiry).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : 'dd-mm-yy'],
              ['Bank', s.loan_bank && s.loan_bank !== 'nan' ? s.loan_bank : 'Not set'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-baseline py-3 text-sm">
                <span className="text-gray-400 font-medium">{label}</span>
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
            <div className="section-label">Target Apartment</div>
            <p className="text-xs text-gray-400 -mt-2">
              The apartment price sets your down payment target. Sweden requires a minimum 10% down payment.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Apartment Price (SEK)</label>
                <input
                  type="number" className="input" min={0} step={50000}
                  placeholder="e.g. 4000000"
                  value={form.apartment_price || ''}
                  onChange={e => set('apartment_price', parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="label">Down Payment %</label>
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
            <p className="text-xs text-gray-400 -mt-2">
              Enter each person's current total savings and how much they add each month.
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Name (Person 1)</label>
                <input type="text" className="input" value={form.p1_name}
                  onChange={e => set('p1_name', e.target.value)} />
              </div>
              <div>
                <label className="label">{form.p1_name || 'Person 1'} — Total Savings</label>
                <input type="number" className="input" min={0} step={10000} placeholder="e.g. 150000"
                  value={form.p1_current || ''}
                  onChange={e => set('p1_current', parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className="label">{form.p1_name || 'Person 1'} — Monthly Savings</label>
                <input type="number" className="input" min={0} step={1000} placeholder="e.g. 10000"
                  value={form.p1_monthly || ''}
                  onChange={e => set('p1_monthly', parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className="label">Name (Person 2)</label>
                <input type="text" className="input" value={form.p2_name}
                  onChange={e => set('p2_name', e.target.value)} />
              </div>
              <div>
                <label className="label">{form.p2_name || 'Person 2'} — Total Savings</label>
                <input type="number" className="input" min={0} step={10000} placeholder="e.g. 150000"
                  value={form.p2_current || ''}
                  onChange={e => set('p2_current', parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className="label">{form.p2_name || 'Person 2'} — Monthly Savings</label>
                <input type="number" className="input" min={0} step={1000} placeholder="e.g. 10000"
                  value={form.p2_monthly || ''}
                  onChange={e => set('p2_monthly', parseInt(e.target.value) || 0)} />
              </div>
            </div>
          </div>

          {/* Lånelöfte */}
          <div className="card space-y-4">
            <div className="section-label">Lånelöfte (Loan Promise)</div>
            <p className="text-xs text-gray-400 -mt-2">
              Your lånelöfte is issued by your bank and is valid for 3–6 months.
              You need it before you can bid.
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Loan Promise Amount (SEK)</label>
                <input type="number" className="input" min={0} step={100000} placeholder="e.g. 3000000"
                  value={form.loan_amount || ''}
                  onChange={e => set('loan_amount', parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className="label">Expiry Date</label>
                <input type="date" className="input"
                  value={form.loan_expiry && form.loan_expiry !== 'nan' ? form.loan_expiry : ''}
                  onChange={e => set('loan_expiry', e.target.value)} />
              </div>
              <div>
                <label className="label">Bank</label>
                <input type="text" className="input"
                  placeholder="e.g. SEB, Swedbank, SBAB"
                  value={form.loan_bank && form.loan_bank !== 'nan' ? form.loan_bank : ''}
                  onChange={e => set('loan_bank', e.target.value)} />
              </div>
            </div>
          </div>

        </form>
      )}

      {/* Projection table */}
      <div className="card">
        <h2 className="text-base font-bold text-gray-900 mb-4">Monthly Breakdown</h2>
        {projDisplay.length > 0 ? (
          <ProjectionTable rows={projDisplay} />
        ) : (
          <p className="text-sm text-gray-400">Set your savings to see the projection.</p>
        )}
      </div>
    </div>
  )
}
