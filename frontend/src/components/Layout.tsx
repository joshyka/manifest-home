import { NavLink } from 'react-router-dom'
import { LayoutDashboard, PiggyBank, Calendar, Map, Calculator, GitCompare, CheckSquare, Gavel, LogOut } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { dashboard } from '../lib/api'
import { supabase } from '../lib/supabase'
import clsx from 'clsx'

const NAV = [
  { to: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/savings',     label: 'Savings',     icon: PiggyBank },
  { to: '/checklist',   label: 'Checklist',   icon: CheckSquare },
  { to: '/viewings',    label: 'Viewings',    icon: Calendar },
  { to: '/bid-tracker', label: 'Bid Tracker', icon: Gavel },
  { to: '/comparison',  label: 'Comparison',  icon: GitCompare },
  { to: '/calculator',  label: 'Calculator',  icon: Calculator },
  { to: '/maps',        label: 'Maps',        icon: Map },
]

interface Props {
  children: React.ReactNode
}

export default function Layout({ children }: Props) {
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: dashboard.get })

  const p1 = data?.settings?.p1_name || ''
  const p2 = data?.settings?.p2_name || ''
  const current = data?.kpis?.current_savings ?? 0
  const target  = data?.kpis?.target ?? 0
  const pct     = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 flex flex-col" style={{ background: '#1E5C3A' }}>

        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-xl"
                 style={{ background: 'rgba(212,168,83,0.15)', border: '1px solid rgba(212,168,83,0.25)' }}>
              🏡
            </div>
            <div className="font-black text-lg tracking-tight">
              <span style={{ color: '#D4A853' }}>Key</span><span className="text-white/90">Journey</span>
            </div>
          </div>
        </div>

        {/* Progress widget */}
        {(p1 || p2) && (
          <div className="mx-4 mt-5 p-4 rounded-2xl border border-white/[0.07]"
               style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
                 style={{ color: '#D4A853' }}>Buyers</div>
            <div className="text-white font-semibold text-sm mb-3 truncate">
              {p1 || '—'}{p1 && p2 ? ' & ' : ''}{p2 || ''}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-2 text-white/40">
              Down Payment
            </div>
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-white font-bold text-sm">{current.toLocaleString('sv-SE')} kr</span>
              <span className="text-xs font-bold" style={{ color: '#D4A853' }}>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #3DAA6E, #D4A853)' }}
              />
            </div>
            <div className="text-[11px] mt-2 text-white/30">
              Target: {target.toLocaleString('sv-SE')} kr
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  isActive
                    ? 'text-white'
                    : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                )
              }
              style={({ isActive }) => isActive ? {
                background: 'rgba(212,168,83,0.12)',
                color: '#D4A853',
                border: '1px solid rgba(212,168,83,0.18)',
              } : {}}
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-white/[0.06]">
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold
                       text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
