import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, Loader2 } from 'lucide-react'

interface Suggestion {
  label: string
  full: string
}

interface Props {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  label?: string
}

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

async function fetchSuggestions(query: string): Promise<Suggestion[]> {
  if (query.trim().length < 3) return []
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lang=en`
  const res = await fetch(url)
  const json = await res.json()
  return (json.features ?? []).map((f: any) => {
    const p = f.properties
    const parts = [p.name, p.street, p.housenumber, p.city, p.country]
      .filter(Boolean)
    const label = p.name || p.street || query
    const full  = parts.join(', ')
    return { label, full }
  })
}

export default function AddressInput({ value, onChange, placeholder, label }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading]         = useState(false)
  const [open, setOpen]               = useState(false)
  const [active, setActive]           = useState(-1)
  const containerRef                  = useRef<HTMLDivElement>(null)

  // Debounced fetch
  const search = useCallback(
    debounce(async (q: string) => {
      if (q.trim().length < 3) { setSuggestions([]); setLoading(false); return }
      setLoading(true)
      try {
        const results = await fetchSuggestions(q)
        setSuggestions(results)
        setOpen(results.length > 0)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 350),
    []
  )

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    onChange(val)
    setActive(-1)
    if (val.trim().length >= 3) {
      setLoading(true)
      search(val)
    } else {
      setSuggestions([])
      setOpen(false)
      setLoading(false)
    }
  }

  function pick(s: Suggestion) {
    onChange(s.full)
    setSuggestions([])
    setOpen(false)
    setActive(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(a => Math.min(a + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(a => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault()
      pick(suggestions[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      {label && <label className="label text-green-600">{label}</label>}
      <div className="relative">
        <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
        {loading && (
          <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 animate-spin pointer-events-none" />
        )}
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="input pl-9 pr-8"
          autoComplete="off"
        />
      </div>

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white border border-gray-100
                        rounded-2xl shadow-card-hover overflow-hidden animate-slide-up">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => pick(s)}
              onMouseEnter={() => setActive(i)}
              className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors text-sm
                          border-b border-gray-50 last:border-0 ${
                            i === active ? 'bg-teal-50' : 'hover:bg-gray-50'
                          }`}
            >
              <MapPin size={13} className="mt-0.5 shrink-0 text-teal-600" />
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 truncate">{s.label}</div>
                <div className="text-xs text-gray-400 truncate mt-0.5">{s.full}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
