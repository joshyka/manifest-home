import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleGoogle() {
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (err) {
      setError(err.message)
      setLoading(false)
    }
    // On success the browser redirects — no further action needed
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: 'linear-gradient(135deg, #1E5C3A 0%, #2E7D52 60%, #3DAA6E 100%)' }}>

      <div className="absolute inset-0 opacity-[0.03]"
           style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, #D4A853 0%, transparent 50%), radial-gradient(circle at 75% 75%, #3DAA6E 0%, transparent 50%)' }} />

      <div className="relative w-full max-w-sm animate-slide-up">
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

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200
                       rounded-2xl text-sm font-semibold text-gray-700 bg-white
                       hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Google logo */}
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
            </svg>
            {loading ? 'Redirecting…' : 'Continue with Google'}
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          <div className="h-px w-12 rounded" style={{ background: 'rgba(212,168,83,0.35)' }} />
          <div className="text-xs font-semibold" style={{ color: 'rgba(212,168,83,0.6)' }}>KeyJourney</div>
          <div className="h-px w-12 rounded" style={{ background: 'rgba(212,168,83,0.35)' }} />
        </div>
      </div>
    </div>
  )
}
