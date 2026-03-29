import { useState } from 'react'
import { ArrowUpDown } from 'lucide-react'
import AddressInput from '../components/AddressInput'

const TRAVEL_MODES = [
  { label: 'Driving',   dirflg: 'd', mode: 'driving' },
  { label: 'Transit',   dirflg: 'r', mode: 'transit' },
  { label: 'Walking',   dirflg: 'w', mode: 'walking' },
  { label: 'Cycling',   dirflg: 'b', mode: 'bicycling' },
]

const AMENITIES = [
  { label: 'Preschool',   query: 'förskola' },
  { label: 'Gym',         query: 'gym fitness' },
  { label: 'Grocery',     query: 'grocery store ICA Coop' },
  { label: 'Pendeltåg',   query: 'pendeltåg station' },
  { label: 'Spårvagn',    query: 'spårvagn tram station' },
  { label: 'Bus stop',    query: 'busshållplats' },
  { label: 'Vårdcentral', query: 'vårdcentral' },
  { label: 'Apotek',      query: 'apotek' },
  { label: 'Restaurant',  query: 'restaurant' },
]

function encodeQ(s: string) { return encodeURIComponent(s) }

export default function Maps() {
  const [from, setFrom]       = useState('')
  const [to, setTo]           = useState('')
  const [mode, setMode]       = useState(TRAVEL_MODES[0])
  const [amenity, setAmenity] = useState<string | null>(null)
  const [radius, setRadius]   = useState(5)

  function swap() { setFrom(to); setTo(from); setAmenity(null) }
  function toggleAmenity(query: string) { setAmenity(a => a === query ? null : query) }

  // Build map URLs
  let embedUrl: string
  let openUrl: string
  const dest   = to.trim()
  const origin = from.trim()

  if (amenity && dest) {
    const q = encodeQ(`${amenity} within ${radius}km near ${dest}`)
    embedUrl = `https://maps.google.com/maps?q=${q}&output=embed&z=${radius <= 5 ? 14 : radius <= 10 ? 13 : 12}`
    openUrl  = `https://www.google.com/maps/search/${q}`
  } else if (origin && dest) {
    const o = encodeQ(origin), d = encodeQ(dest)
    embedUrl = `https://maps.google.com/maps?saddr=${o}&daddr=${d}&dirflg=${mode.dirflg}&output=embed`
    openUrl  = `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}&travelmode=${mode.mode}`
  } else if (dest) {
    embedUrl = `https://maps.google.com/maps?q=${encodeQ(dest)}&output=embed`
    openUrl  = `https://www.google.com/maps/search/${encodeQ(dest)}`
  } else {
    embedUrl = 'https://maps.google.com/maps?q=Sweden&output=embed&z=5'
    openUrl  = 'https://www.google.com/maps/place/Sweden'
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Maps</h1>
        <p className="text-sm text-gray-400 mt-0.5">Explore areas and plan your search</p>
      </div>

      <div className="card space-y-4">
        {/* From / To */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
          <AddressInput label="From" value={from} onChange={setFrom} placeholder="e.g. Drottninggatan 1, Stockholm" />
          <button
            onClick={swap}
            className="mb-0.5 w-9 h-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50
                       flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
            title="Swap"
          >
            <ArrowUpDown size={15} />
          </button>
          <AddressInput label="To" value={to} onChange={v => { setTo(v); setAmenity(null) }} placeholder="e.g. Kungsgatan 10, Stockholm" />
        </div>

        {/* Travel mode */}
        <div className="flex gap-2 flex-wrap">
          {TRAVEL_MODES.map(m => (
            <button
              key={m.label}
              onClick={() => { setMode(m); setAmenity(null) }}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                mode.label === m.label && !amenity
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Amenity filters */}
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Nearby amenities{to.trim() ? <span className="normal-case font-normal ml-1">near <span className="font-semibold text-gray-600">{to.trim()}</span></span> : ''}
          </div>
          <div className="flex gap-2 flex-wrap">
            {AMENITIES.map(a => (
              <button
                key={a.label}
                onClick={() => toggleAmenity(a.query)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                  amenity === a.query
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          {amenity && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-gray-400 font-medium">Search radius:</span>
              {[2, 5, 10].map(r => (
                <button
                  key={r}
                  onClick={() => setRadius(r)}
                  className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                    radius === r
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {r}km
                </button>
              ))}
            </div>
          )}
          {amenity && !dest && <p className="text-xs text-gray-400 mt-2">Enter a "To" address to search nearby.</p>}
          {amenity && dest && <p className="text-xs text-gray-400 mt-2">Tap the highlighted filter again to go back to directions.</p>}
        </div>

        <a
          href={openUrl}
          target="_blank"
          rel="noreferrer"
          className="block text-center text-sm font-semibold text-teal-700 hover:text-teal-800 transition-colors"
        >
          Open in Google Maps ↗
        </a>
      </div>

      {/* Embedded map */}
      <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        <iframe
          src={embedUrl}
          width="100%"
          height="520"
          style={{ border: 0, display: 'block' }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Google Maps"
        />
      </div>
    </div>
  )
}
