import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, PiggyBank, Calendar, Map, Calculator, GitCompare, CheckSquare, Gavel, LogOut, Menu, X, Plus, MapPin, Building2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { dashboard } from '../lib/api'
import { supabase } from '../lib/supabase'
import clsx from 'clsx'

const NAV = [
  { to: '/dashboard',   label: 'Overview',    icon: LayoutDashboard },
  { to: '/savings',     label: 'Savings',     icon: PiggyBank },
  { to: '/checklist',   label: 'Checklist',   icon: CheckSquare },
  { to: '/viewings',    label: 'Viewings',    icon: Calendar },
  { to: '/bid-tracker', label: 'Bid Tracker', icon: Gavel },
  { to: '/comparison',  label: 'Comparison',  icon: GitCompare },
  { to: '/calculator',  label: 'Calculator',  icon: Calculator },
  { to: '/areas',       label: 'Areas',       icon: MapPin },
  { to: '/brf-checker', label: 'BRF Checker', icon: Building2 },
  { to: '/maps',        label: 'Maps',        icon: Map },
]

interface Props {
  children: React.ReactNode
}

function SidebarContents({ pct, current, target, p1, p2, onNav }: {
  pct: number; current: number; target: number; p1: string; p2: string; onNav?: () => void
}) {
  return (
    <>
      {/* Logo */}
      <div className="px-6 py-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
               style={{ background: '#F0FAF4', border: '1px solid #D1EAD8' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="8" cy="8" r="4.5" stroke="#2E7D52" strokeWidth="2"/>
              <circle cx="8" cy="8" r="1.5" fill="#2E7D52"/>
              <path d="M11 11.5L20 20.5" stroke="#2E7D52" strokeWidth="2" strokeLinecap="round"/>
              <path d="M17 18.5L19 16.5" stroke="#2E7D52" strokeWidth="2" strokeLinecap="round"/>
              <path d="M19 20.5L21 18.5" stroke="#2E7D52" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="font-black text-lg tracking-tight">
            <span style={{ color: '#2E7D52' }}>Key</span><span className="text-gray-800">Journey</span>
          </div>
        </div>
      </div>

      {/* Progress widget */}
      {(p1 || p2) && (
        <div className="mx-4 mt-5 p-4 rounded-2xl border border-gray-100" style={{ background: '#F9FAFB' }}>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5 text-gray-400">Buyers</div>
          <div className="text-gray-800 font-semibold text-sm mb-3 truncate">
            {p1 || '—'}{p1 && p2 ? ' & ' : ''}{p2 || ''}
          </div>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-gray-700 font-bold text-sm">{current.toLocaleString('sv-SE')} kr</span>
            <span className="text-xs font-bold text-teal-600">{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden bg-gray-100">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #2E7D52, #3DAA6E)' }}
            />
          </div>
          <div className="text-[11px] mt-2 text-gray-400">
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
            onClick={onNav}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all',
                isActive
                  ? 'text-teal-700'
                  : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
              )
            }
            style={({ isActive }) => isActive ? {
              background: '#F0FAF4',
              color: '#2E7D52',
            } : {}}
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </nav>

    </>
  )
}

export default function Layout({ children }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: dashboard.get })

  const p1 = data?.settings?.p1_name || ''
  const p2 = data?.settings?.p2_name || ''
  const current = data?.kpis?.current_savings ?? 0
  const target  = data?.kpis?.target ?? 0
  const pct     = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0

  return (
    <div className="flex min-h-screen bg-surface">

      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-gray-100" style={{ background: '#FFFFFF' }}>
        <SidebarContents pct={pct} current={current} target={target} p1={p1} p2={p2} />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center px-4 py-3 border-b border-gray-100"
           style={{ background: '#FFFFFF' }}>
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all"
        >
          <Menu size={22} />
        </button>
        <div className="flex-1 text-center font-black text-base tracking-tight">
          <span style={{ color: '#2E7D52' }}>Key</span><span className="text-gray-800">Journey</span>
        </div>
        {/* spacer to center the title */}
        <div className="w-8" />
      </div>

      {/* Drawer overlay — mobile only */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 flex"
          onClick={() => setDrawerOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Drawer panel */}
          <aside
            className="relative w-72 flex flex-col h-full"
            style={{ background: '#FFFFFF' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all"
            >
              <X size={20} />
            </button>
            <SidebarContents
              pct={pct} current={current} target={target} p1={p1} p2={p2}
              onNav={() => setDrawerOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col overflow-auto pt-14 md:pt-0">
        <div className="flex-1 max-w-5xl w-full mx-auto px-4 md:px-10 py-8 md:py-10 animate-fade-in">
          <div className="flex items-center justify-end gap-3 -mt-2 mb-6">
            <button
              onClick={() => { qc.clear(); supabase.auth.signOut() }}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 transition-colors"
            >
              <LogOut size={13} />
              Sign out
            </button>
          </div>
          {children}
        </div>
        <div className="text-center text-xs text-gray-300 py-4 border-t border-gray-100">
          <span className="text-gray-400">© 2026 KeyJourney</span>
        </div>
      </main>

      {/* FAB — mobile only */}
      <button
        className="md:hidden fixed bottom-6 right-5 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-95"
        style={{ background: 'linear-gradient(135deg, #1E5C3A, #3DAA6E)' }}
        onClick={() => navigate('/viewings?add=1')}
        title="Add viewing"
      >
        <Plus size={26} className="text-white" />
      </button>

    </div>
  )
}
