import { useState } from 'react'
import { supabase } from '../lib/supabase'

const APP_EMAIL = import.meta.env.VITE_APP_EMAIL as string

export default function Login() {
  const [pin, setPin]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

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
            <p className="text-sm text-gray-400 mt-1.5">Enter your PIN to continue</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-2.5 text-center font-semibold mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              inputMode="numeric"
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
        </div>
      </div>
    </div>
  )
}
