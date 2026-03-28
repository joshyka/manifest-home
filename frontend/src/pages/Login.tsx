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
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: 'linear-gradient(135deg, #1E5C3A 0%, #2E7D52 60%, #3DAA6E 100%)' }}>

      <div className="relative w-full max-w-xs animate-slide-up">
        <div className="bg-white rounded-3xl shadow-2xl p-8">

          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 text-3xl"
                 style={{ background: 'linear-gradient(135deg, #1E5C3A, #2E7D52)', boxShadow: '0 8px 24px rgba(46,125,82,0.35)' }}>
              🏡
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">KeyJourney</h1>
            <p className="text-sm text-gray-400 mt-1.5">Sign in to continue</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-2.5 text-center font-semibold mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              inputMode="text"
              placeholder="PIN"
              value={pin}
              onChange={e => setPin(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #1E5C3A, #2E7D52)' }}
            >
              {loading ? 'Checking…' : 'Unlock'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 font-medium">or</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <button
            onClick={handleGoogle}
            disabled={gLoading}
            className="w-full py-3 rounded-2xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M44.5 20H24v8.5h11.7C34.2 33.6 29.7 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6-6C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.4-.1-2.7-.4-4z"/>
            </svg>
            {gLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

        </div>
      </div>
    </div>
  )
}
