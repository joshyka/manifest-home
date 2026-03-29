import { useState } from 'react'
import { supabase } from '../lib/supabase'

const APP_EMAIL = import.meta.env.VITE_APP_EMAIL as string

export default function Login() {
  const [pin, setPin]           = useState('')
  const [loading, setLoading]   = useState(false)
  const [gLoading, setGLoading] = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({
      email: APP_EMAIL,
      password: pin,
    })
    if (err) setError('Incorrect PIN')
    setLoading(false)
  }

  async function handleGoogle() {
    setGLoading(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (err) {
      setError('Google sign-in failed')
      setGLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface">

      <div className="w-full max-w-sm animate-slide-up">
        <div className="bg-white rounded-3xl shadow-card p-8">

          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                 style={{ background: '#F0FAF4', border: '1px solid #D1EAD8' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="4.5" stroke="#2E7D52" strokeWidth="2"/>
                <circle cx="8" cy="8" r="1.5" fill="#2E7D52"/>
                <path d="M11 11.5L20 20.5" stroke="#2E7D52" strokeWidth="2" strokeLinecap="round"/>
                <path d="M17 18.5L19 16.5" stroke="#2E7D52" strokeWidth="2" strokeLinecap="round"/>
                <path d="M19 20.5L21 18.5" stroke="#2E7D52" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              <span style={{ color: '#2E7D52' }}>Key</span><span className="text-gray-800">Journey</span>
            </h1>
            <p className="text-sm text-gray-400 mt-1.5">Hemresan börjar här.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-500 text-sm rounded-2xl px-4 py-2.5 text-center font-medium mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              inputMode="text"
              placeholder="Enter PIN"
              value={pin}
              onChange={e => setPin(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-gray-50/50 transition-all"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Checking…' : 'Unlock'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-300 font-medium">or</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <button
            onClick={handleGoogle}
            disabled={gLoading}
            className="w-full py-3 rounded-full text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {gLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

        </div>

        <p className="text-center text-xs text-gray-400 mt-6">© 2026 KeyJourney</p>
        <p className="text-center text-xs text-gray-400 mt-2">
          By signing in you agree to our{' '}
          <a href="/terms" className="underline hover:text-gray-500">Terms</a>{' '}and{' '}
          <a href="/privacy" className="underline hover:text-gray-500">Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}
