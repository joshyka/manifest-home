import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { settings as settingsApi } from './lib/api'
import Layout from './components/Layout'
import Onboarding from './components/Onboarding'
import Login from './pages/Login'
import Dashboard from './pages/Overview'
import Savings from './pages/Savings'
import Viewings from './pages/Viewings'
import Maps from './pages/Maps'
import Calculator from './pages/Calculator'
import Comparison from './pages/Comparison'
import Checklist from './pages/Checklist'
import BrfChecker from './pages/BrfChecker'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import SettingsPage from './pages/Settings'

function App() {
  const [session, setSession]       = useState<Session | null | undefined>(undefined)
  const [onboarded, setOnboarded]   = useState(() => localStorage.getItem('kj_onboarded') === '1')
  const [authorized, setAuthorized] = useState(false)
  const [denied, setDenied]         = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setAuthorized(false); setDenied(false); return }
    settingsApi.get()
      .then(() => setAuthorized(true))
      .catch(() => setDenied(true))
  }, [session])

  useEffect(() => {
    if (!denied) return
    const t = setTimeout(async () => {
      await supabase.auth.signOut()
      setDenied(false)
    }, 3000)
    return () => clearTimeout(t)
  }, [denied])

  if (denied) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-surface">
        <div className="bg-white rounded-3xl shadow-card p-8 w-full max-w-xs text-center space-y-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" d="M15 9l-6 6M9 9l6 6" />
            </svg>
          </div>
          <h2 className="text-lg font-black text-gray-900">Access Denied</h2>
          <p className="text-xs text-gray-400">Your account is not on the allowed list.</p>
          <p className="text-xs text-gray-300">Redirecting to login…</p>
        </div>
      </div>
    )
  }

  // Loading
  if (session === undefined || (session && !authorized)) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return (
    <Routes>
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="*" element={<Login />} />
    </Routes>
  )

  if (!onboarded) return <Onboarding onComplete={() => { localStorage.setItem('kj_onboarded', '1'); setOnboarded(true) }} />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/savings" element={<Savings />} />
        <Route path="/viewings" element={<Viewings />} />
        <Route path="/maps" element={<Maps />} />
        <Route path="/calculator" element={<Calculator />} />
        <Route path="/comparison" element={<Comparison />} />
        <Route path="/checklist" element={<Checklist />} />
        <Route path="/brf-checker" element={<BrfChecker />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  )
}

export default App
