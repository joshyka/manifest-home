import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Savings from './pages/Savings'
import Viewings from './pages/Viewings'
import Maps from './pages/Maps'
import Calculator from './pages/Calculator'
import Comparison from './pages/Comparison'
import Checklist from './pages/Checklist'
import BidTracker from './pages/BidTracker'

function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  // Loading
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-forest-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return <Login />

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
        <Route path="/bid-tracker" element={<BidTracker />} />
      </Routes>
    </Layout>
  )
}

export default App
